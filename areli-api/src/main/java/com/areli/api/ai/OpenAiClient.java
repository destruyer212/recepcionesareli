package com.areli.api.ai;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Component
public class OpenAiClient {
    private final AiProperties properties;
    private final RestClient restClient;

    public OpenAiClient(AiProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        this.restClient = builder
                .baseUrl(properties.openai().baseUrl())
                .requestInterceptor((request, body, execution) -> {
                    request.getHeaders().setBearerAuth(properties.openai().apiKey());
                    return execution.execute(request, body);
                })
                .build();
    }

    public String generate(String taskName, String instructions, String input) {
        if (!properties.enabled()) {
            return "IA desactivada. Configura AI_ENABLED=true y OPENAI_API_KEY para usar " + taskName + ".";
        }
        if (!StringUtils.hasText(properties.openai().apiKey())) {
            throw new IllegalStateException("Falta configurar OPENAI_API_KEY.");
        }

        Map<String, Object> payload = Map.of(
                "model", properties.defaultModel(),
                "instructions", instructions,
                "input", input,
                "max_output_tokens", 1200
        );

        JsonNode response = restClient.post()
                .uri("/responses")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(JsonNode.class);

        return extractText(response);
    }

    public String model() {
        return properties.defaultModel();
    }

    private String extractText(JsonNode response) {
        if (response == null) {
            return "";
        }
        JsonNode outputText = response.get("output_text");
        if (outputText != null && outputText.isTextual()) {
            return outputText.asText();
        }

        JsonNode output = response.get("output");
        if (output != null && output.isArray()) {
            StringBuilder builder = new StringBuilder();
            output.forEach(item -> {
                JsonNode content = item.get("content");
                if (content != null && content.isArray()) {
                    content.forEach(part -> {
                        JsonNode text = part.get("text");
                        if (text != null && text.isTextual()) {
                            if (!builder.isEmpty()) {
                                builder.append(System.lineSeparator());
                            }
                            builder.append(text.asText());
                        }
                    });
                }
            });
            return builder.toString();
        }
        return response.toPrettyString();
    }
}
