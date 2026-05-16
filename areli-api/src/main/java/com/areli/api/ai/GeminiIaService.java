package com.areli.api.ai;

import com.areli.api.ai.dto.IaEventoResponse;
import com.areli.api.ai.dto.IaMensajeRequest;
import com.areli.api.service.AppSettingsService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Service
public class GeminiIaService {
    private static final String SYSTEM_PROMPT = """
            Eres un asistente inteligente para un sistema de gestion de eventos.

            El usuario puede escribir con errores ortograficos, abreviaciones, palabras incompletas,
            frases mal ordenadas o sin signos de puntuacion.

            Tu trabajo es entender la intencion real del usuario y convertirla en una accion clara
            para el sistema.

            Puedes detectar estas acciones:
            - CREAR_EVENTO
            - ACTUALIZAR_EVENTO
            - BUSCAR_EVENTO
            - CREAR_CLIENTE
            - ASIGNAR_PERSONAL
            - CREAR_TAREA
            - RESPONDER_PREGUNTA

            Reglas:
            - Nunca inventes datos.
            - Si falta informacion importante, agregala en faltantes.
            - No digas que algo fue guardado.
            - El backend es quien guarda, tu solo interpretas.
            - Si el usuario dice sabado pero no indica fecha exacta, pedir fecha exacta.
            - Si detectas nombres, telefonos, servicios, cantidades, fechas u horas, ordenalos.
            - Si un numero puede ser telefono o cantidad de invitados, analiza el contexto.
            - Si hay duda, pregunta.
            - Siempre responde SOLO JSON valido, sin texto adicional.

            Formato obligatorio de respuesta:
            {
              "accion": "CREAR_EVENTO | ACTUALIZAR_EVENTO | BUSCAR_EVENTO | CREAR_CLIENTE | ASIGNAR_PERSONAL | CREAR_TAREA | RESPONDER_PREGUNTA",
              "datos": {
                "tipoEvento": "",
                "fecha": "",
                "hora": "",
                "clientePrincipal": "",
                "clienteSecundario": "",
                "cantidadInvitados": null,
                "local": "",
                "servicios": [],
                "personal": [],
                "telefono": "",
                "observaciones": ""
              },
              "faltantes": [],
              "mensajeUsuario": "",
              "confirmacionNecesaria": true
            }
            """;

    private final ObjectMapper objectMapper;
    private final AppSettingsService appSettingsService;
    private final RestClient restClient;

    public GeminiIaService(
            ObjectMapper objectMapper,
            AppSettingsService appSettingsService,
            RestClient.Builder builder,
            @Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl
    ) {
        this.objectMapper = objectMapper;
        this.appSettingsService = appSettingsService;
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public IaEventoResponse interpretar(IaMensajeRequest request) {
        String apiKey = appSettingsService.resolveGeminiApiKey();
        String model = appSettingsService.resolveGeminiModel();
        if (!StringUtils.hasText(apiKey)) {
            return fallback("Falta configurar GEMINI_API_KEY en el backend.", List.of("GEMINI_API_KEY"));
        }

        try {
            Map<String, Object> payload = Map.of(
                    "system_instruction", Map.of("parts", List.of(Map.of("text", SYSTEM_PROMPT))),
                    "contents", List.of(Map.of(
                            "role", "user",
                            "parts", List.of(Map.of("text", request.mensaje()))
                    )),
                    "generation_config", Map.of(
                            "temperature", 0.2,
                            "response_mime_type", "application/json"
                    )
            );

            JsonNode response = restClient.post()
                    .uri("/models/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);

            return parseResponse(response);
        } catch (Exception ex) {
            return fallback("No se pudo interpretar con Gemini. " + ex.getMessage(), List.of("reintentar interpretacion"));
        }
    }

    public String model() {
        return appSettingsService.resolveGeminiModel();
    }

    private IaEventoResponse parseResponse(JsonNode response) throws Exception {
        String text = extractText(response);
        if (!StringUtils.hasText(text)) {
            return fallback("Gemini no devolvio una interpretacion util.", List.of("mensaje mas detallado"));
        }
        Map<String, Object> decoded = objectMapper.readValue(cleanJson(text), new TypeReference<>() {
        });
        return new IaEventoResponse(
                asString(decoded.get("accion")),
                asMap(decoded.get("datos")),
                asStringList(decoded.get("faltantes")),
                asString(decoded.get("mensajeUsuario")),
                Boolean.TRUE.equals(decoded.get("confirmacionNecesaria"))
        );
    }

    private String extractText(JsonNode response) {
        JsonNode candidates = response == null ? null : response.get("candidates");
        if (candidates == null || !candidates.isArray() || candidates.isEmpty()) {
            return "";
        }
        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (!parts.isArray() || parts.isEmpty()) {
            return "";
        }
        return parts.get(0).path("text").asText("");
    }

    private String cleanJson(String text) {
        String cleaned = text.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```(?:json)?\\s*", "");
            cleaned = cleaned.replaceFirst("\\s*```$", "");
        }
        return cleaned.trim();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    }

    private List<String> asStringList(Object value) {
        if (!(value instanceof List<?> values)) {
            return List.of();
        }
        return values.stream().map(String::valueOf).filter(StringUtils::hasText).toList();
    }

    private String asString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private IaEventoResponse fallback(String message, List<String> faltantes) {
        return new IaEventoResponse("RESPONDER_PREGUNTA", Map.of(), faltantes, message, false);
    }
}
