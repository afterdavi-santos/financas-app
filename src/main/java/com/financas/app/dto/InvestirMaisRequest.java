package com.financas.app.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record InvestirMaisRequest(
        @NotNull @Positive @Digits(integer = 11, fraction = 2) BigDecimal valor
) {
}
