package com.financas.app.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ObjetivoRequest(
        @NotBlank @Size(max = 255) String descricao,
        @Size(max = 255) String incentivo,
        @NotNull @Positive @Digits(integer = 11, fraction = 2) BigDecimal valorAlvo,
        @NotNull LocalDate dataAlvo
) {
}
