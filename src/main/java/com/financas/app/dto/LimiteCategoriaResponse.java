package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LimiteCategoriaResponse(Long id, BigDecimal valorLimite, LocalDate mesReferencia, CategoriaResponse categoria) {
}
