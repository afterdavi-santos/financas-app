package com.financas.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InvestimentoCdbRequest(
        @NotBlank String descricao,
        @NotNull @Positive BigDecimal valorAplicado,
        @NotNull @Positive BigDecimal percentualCdi,
        @NotNull LocalDate dataAplicacao
) {
}
