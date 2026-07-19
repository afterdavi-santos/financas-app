package com.financas.app.service;

import java.math.BigDecimal;

public record ResumoAnual(int ano, BigDecimal totalRenda, BigDecimal totalDespesas, BigDecimal economia) {
}
