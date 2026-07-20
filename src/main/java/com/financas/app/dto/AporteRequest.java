package com.financas.app.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record AporteRequest(@NotNull @Positive BigDecimal valor) {
}
