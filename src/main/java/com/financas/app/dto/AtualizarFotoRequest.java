package com.financas.app.dto;

import jakarta.validation.constraints.NotBlank;

public record AtualizarFotoRequest(
        @NotBlank String fotoBase64,
        @NotBlank String tipo
) {
}
