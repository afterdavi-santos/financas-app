package com.financas.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ObjetivoRequest(
        @NotBlank String descricao,
        String incentivo,
        @NotNull @Positive BigDecimal valorAlvo,
        @NotNull LocalDate dataAlvo
) {
}
