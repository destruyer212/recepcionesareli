package com.areli.api.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
        boolean enabled,
        String provider,
        String defaultModel,
        OpenAi openai
) {
    public record OpenAi(String apiKey, String baseUrl, int timeoutSeconds) {
    }
}
