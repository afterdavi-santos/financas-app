package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AporteResponse(Long id, BigDecimal valor, LocalDate data) {
}
