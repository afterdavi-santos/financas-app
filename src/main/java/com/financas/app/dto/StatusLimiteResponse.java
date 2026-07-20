package com.financas.app.dto;

import java.math.BigDecimal;

public record StatusLimiteResponse(BigDecimal valorLimite, BigDecimal valorGasto, boolean estourado) {
}
