package com.financas.app.dto;

import com.financas.app.model.enums.TipoRenda;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RendaRequest(
        @NotBlank @Size(max = 255) String descricao,
        @NotNull @Positive @Digits(integer = 11, fraction = 2) BigDecimal valor,
        @NotNull LocalDate mesReferencia,
        @NotNull TipoRenda tipo
) {
}
