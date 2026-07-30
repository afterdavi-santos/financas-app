package com.financas.app.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record InvestirMaisRequest(@NotNull @Positive BigDecimal valor) {
}
