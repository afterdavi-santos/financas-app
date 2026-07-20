package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RendaResponse(Long id, String descricao, BigDecimal valor, LocalDate mesReferencia) {
}
