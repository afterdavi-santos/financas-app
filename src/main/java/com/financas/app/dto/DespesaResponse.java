package com.financas.app.dto;

import com.financas.app.model.enums.FormaPagamento;
import com.financas.app.model.enums.TipoCategoria;

import java.math.BigDecimal;
import java.time.LocalDate;

// `tipo` é derivado da categoria da despesa (categoria.getTipo()), nunca
// persistido na própria despesa — ver DespesaController.toResponse.
//
// `valor` é o valor DESTA parcela, não o total da compra: cada parcela é uma
// despesa de verdade no mês dela. Quem quiser o total multiplica/soma o grupo
// (parcelamentoId).
public record DespesaResponse(
        Long id,
        String descricao,
        BigDecimal valor,
        LocalDate data,
        LocalDate mesReferencia,
        TipoCategoria tipo,
        CategoriaResponse categoria,
        boolean recorrente,
        FormaPagamento formaPagamento,
        Integer parcelaNumero,
        Integer parcelasTotal,
        Long parcelamentoId
) {
}
