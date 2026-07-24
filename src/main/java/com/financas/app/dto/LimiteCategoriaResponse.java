package com.financas.app.dto;

import java.math.BigDecimal;

public record LimiteCategoriaResponse(Long id, BigDecimal valorLimite, CategoriaResponse categoria) {
}
