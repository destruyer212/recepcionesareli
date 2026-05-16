package com.areli.api.ai.dto;

import java.util.List;
import java.util.Map;

public record IaEventoResponse(
        String accion,
        Map<String, Object> datos,
        List<String> faltantes,
        String mensajeUsuario,
        boolean confirmacionNecesaria
) {
    public IaEventoResponse {
        accion = valueOrDefault(accion, "RESPONDER_PREGUNTA");
        datos = datos == null ? Map.of() : datos;
        faltantes = faltantes == null ? List.of() : faltantes;
        mensajeUsuario = valueOrDefault(mensajeUsuario, "No pude interpretar el mensaje con seguridad.");
    }

    private static String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
