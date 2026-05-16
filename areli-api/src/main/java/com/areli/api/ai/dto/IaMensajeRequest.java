package com.areli.api.ai.dto;

import jakarta.validation.constraints.NotBlank;

public record IaMensajeRequest(
        @NotBlank String mensaje
) {
}
