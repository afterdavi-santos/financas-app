package com.financas.app.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record LimiteCategoriaRequest(
        @NotNull @Positive BigDecimal valorLimite,
        @NotNull Long categoriaId
) {
}
