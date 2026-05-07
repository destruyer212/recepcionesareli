package com.areli.api.service;

import com.areli.api.domain.Enums.DocumentType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.stereotype.Service;

@Service
public class PeruApiLookupService {
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    private final ObjectMapper objectMapper;
    private final AppSettingsService appSettingsService;

    public PeruApiLookupService(ObjectMapper objectMapper, AppSettingsService appSettingsService) {
        this.objectMapper = objectMapper;
        this.appSettingsService = appSettingsService;
    }

    /** DNI/RUC ya solo dígitos y longitud correcta. */
    public LookupResult lookupValidated(DocumentType documentType, String digitsOnly) {
        int expectedLength = documentType == DocumentType.DNI ? 8 : 11;
        if (digitsOnly.length() != expectedLength) {
            throw new IllegalArgumentException(
                    documentType == DocumentType.DNI
                            ? "El DNI debe tener 8 dígitos."
                            : "El RUC debe tener 11 dígitos.");
        }
        return lookup(documentType, digitsOnly);
    }

    public LookupResult lookup(DocumentType documentType, String documentNumber) {
        String apiToken = appSettingsService.resolvePeruApiToken();
        if (apiToken.isBlank()) {
            throw new IllegalStateException(
                    "Falta el token de Perú API. Configúralo en el menú Configuración o en la variable PERU_API_TOKEN.");
        }
        String endpoint = documentType == DocumentType.DNI ? "dni" : "ruc";
        String token = apiToken.trim();
        /* Documentación: X-API-KEY (recomendado) o ?api_token=. Evitamos query para no exponer el token en logs/proxies. */
        String url = "https://peruapi.com/api/" + endpoint + "/" + documentNumber + "?summary=0&plan=0";
        try {
            JsonNode root = fetchPeruApiJson(url, token);
            LookupResult parsed = parseLookupResult(root);
            if ((parsed.fullName() == null || parsed.fullName().isBlank()) && documentType == DocumentType.DNI) {
                // Fallback: algunos planes/cuentas de Perú API responden mejor en api.php para DNI.
                JsonNode fallback = fetchPeruApiJson(
                        "https://peruapi.com/api.php?json=dni&id=" + documentNumber + "&summary=0&plan=0",
                        token);
                LookupResult parsedFallback = parseLookupResult(fallback);
                if (parsedFallback.fullName() != null && !parsedFallback.fullName().isBlank()) {
                    return parsedFallback;
                }
                if (parsed.address() == null && parsedFallback.address() != null) {
                    return new LookupResult(parsed.fullName(), parsedFallback.address());
                }
            }
            String fullName = parsed.fullName();
            String address = parsed.address();
            return new LookupResult(fullName, address);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo consultar Perú API en este momento.", ex);
        }
    }

    private JsonNode fetchPeruApiJson(String url, String token) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(12))
                .header("X-API-KEY", token)
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        String body = response.body() == null ? "" : response.body();
        if (response.statusCode() == 404) {
            throw new IllegalArgumentException("No se encontró información para el documento ingresado.");
        }
        if (response.statusCode() == 401 || response.statusCode() == 403) {
            throw new IllegalStateException(peruApiErrorDetail(body, response.statusCode(), true));
        }
        if (response.statusCode() >= 400) {
            throw new IllegalStateException(peruApiErrorDetail(body, response.statusCode(), false));
        }
        return objectMapper.readTree(body);
    }

    private LookupResult parseLookupResult(JsonNode root) {
        JsonNode data = root.has("data") && !root.get("data").isNull() ? root.get("data") : root;
        String fullName = firstNonBlank(
                text(data, "nombre_completo"),
                text(data, "cliente"),
                joinNameParts(
                        text(data, "nombres"),
                        text(data, "apellido_paterno"),
                        text(data, "apellido_materno")),
                text(data, "nombre"),
                text(data, "razon_social"),
                text(data, "name"));
        String address = firstNonBlank(
                text(data, "direccion"),
                text(data, "domicilio_fiscal"),
                text(data, "address"));
        return new LookupResult(fullName, address);
    }

    private String peruApiErrorDetail(String body, int status, boolean auth) {
        String fromJson = null;
        if (body != null && !body.isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(body);
                if (root.has("mensaje") && !root.get("mensaje").isNull()) {
                    fromJson = root.get("mensaje").asText();
                }
            } catch (Exception ignored) {
                /* cuerpo no JSON */
            }
        }
        String base = fromJson != null && !fromJson.isBlank()
                ? fromJson
                : ("Perú API respondió con error HTTP " + status + ".");
        if (auth) {
            return base
                    + " Si el token es correcto, en planes con IP fija debes autorizar en peruapi.com la IP pública"
                    + " desde la que sale tu servidor (la PC o VPS donde corre areli-api).";
        }
        return base;
    }

    private static String text(JsonNode node, String fieldName) {
        if (node == null || !node.has(fieldName) || node.get(fieldName).isNull()) {
            return null;
        }
        String value = node.get(fieldName).asText();
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private static String joinNameParts(String... values) {
        StringBuilder sb = new StringBuilder();
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                if (!sb.isEmpty()) {
                    sb.append(' ');
                }
                sb.append(value.trim());
            }
        }
        String combined = sb.toString().trim();
        return combined.isEmpty() ? null : combined;
    }

    public record LookupResult(String fullName, String address) {
    }
}
