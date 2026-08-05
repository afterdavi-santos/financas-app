package com.financas.app.dto;

import com.financas.app.model.enums.TipoRenda;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RendaResponse(Long id, String descricao, BigDecimal valor, LocalDate mesReferencia, TipoRenda tipo,
                             boolean recorrente) {
}
