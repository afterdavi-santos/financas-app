package com.financas.app.dto;

import com.financas.app.model.enums.TipoDespesa;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DespesaResponse(
        Long id,
        String descricao,
        BigDecimal valor,
        LocalDate data,
        TipoDespesa tipo,
        CategoriaResponse categoria
) {
}
