package com.financas.app.service;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ResumoMensal(LocalDate mes, BigDecimal totalRenda, BigDecimal totalDespesas, BigDecimal economia) {
}
