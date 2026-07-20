package com.financas.app.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LimiteCategoriaRequest(
        @NotNull @Positive BigDecimal valorLimite,
        @NotNull LocalDate mesReferencia,
        @NotNull Long categoriaId
) {
}
