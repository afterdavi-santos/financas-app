package com.financas.app.service;

import java.math.BigDecimal;

public record StatusLimiteCategoria(BigDecimal valorLimite, BigDecimal valorGasto, boolean estourado) {
}
