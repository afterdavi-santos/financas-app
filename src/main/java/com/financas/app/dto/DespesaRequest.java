package com.financas.app.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

// mesReferencia: opcional — só o Leitor de fatura preenche (mês em que a
// fatura é paga). Null em despesas manuais (mês que conta = mês de `data`).
//
// @Size(max = 255) espelha o varchar(255) da coluna. Sem ele, um texto maior
// só falha lá no INSERT, e o erro do banco vira 500.
public record DespesaRequest(
        @NotBlank @Size(max = 255) String descricao,
        @NotNull @Positive @Digits(integer = 11, fraction = 2) BigDecimal valor,
        @NotNull LocalDate data,
        @NotNull Long categoriaId,
        LocalDate mesReferencia
) {
}
