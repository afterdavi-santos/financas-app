package com.financas.app.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

// `data` é opcional: quando ausente, o serviço usa a data de hoje.
public record AporteRequest(@NotNull @Positive BigDecimal valor, LocalDate data) {
}
