package com.financas.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

// mesReferencia: opcional — só o Leitor de fatura preenche (mês em que a
// fatura é paga). Null em despesas manuais (mês que conta = mês de `data`).
public record DespesaRequest(
        @NotBlank String descricao,
        @NotNull @Positive BigDecimal valor,
        @NotNull LocalDate data,
        @NotNull Long categoriaId,
        LocalDate mesReferencia
) {
}
