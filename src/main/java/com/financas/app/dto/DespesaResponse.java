package com.financas.app.dto;

import com.financas.app.model.enums.TipoCategoria;

import java.math.BigDecimal;
import java.time.LocalDate;

// `tipo` é derivado da categoria da despesa (categoria.getTipo()), nunca
// persistido na própria despesa — ver DespesaController.toResponse.
public record DespesaResponse(
        Long id,
        String descricao,
        BigDecimal valor,
        LocalDate data,
        LocalDate mesReferencia,
        TipoCategoria tipo,
        CategoriaResponse categoria,
        boolean recorrente
) {
}
