package com.financas.app.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

// mesReferencia: mes em foco na tela, que define a vigencia — a partir de
// que mes o limite passa a valer (na criacao) ou o novo valor entra em vigor
// (na edicao). Opcional: ausente, o backend assume o mes corrente.
public record LimiteCategoriaRequest(
        @NotNull @Positive @Digits(integer = 11, fraction = 2) BigDecimal valorLimite,
        @NotNull Long categoriaId,
        LocalDate mesReferencia
) {
}
