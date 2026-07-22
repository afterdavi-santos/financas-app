package com.financas.app.dto;

import com.financas.app.model.enums.TipoRenda;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RendaRequest(
        @NotBlank String descricao,
        @NotNull @Positive BigDecimal valor,
        @NotNull LocalDate mesReferencia,
        @NotNull TipoRenda tipo
) {
}
