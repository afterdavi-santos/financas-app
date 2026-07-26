package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// `valorAplicado` é o principal AINDA investido (reduz a cada resgate parcial).
// `dataResgate` só é preenchida quando o investimento é totalmente liquidado.
// `objetivoId`/`objetivoDescricao` só vêm preenchidos quando este investimento
// está vinculado a uma meta (ver Objetivo.investimentoCdb).
public record InvestimentoCdbResponse(
        Long id,
        String descricao,
        BigDecimal valorAplicado,
        BigDecimal percentualCdi,
        LocalDate dataAplicacao,
        LocalDate dataResgate,
        Long objetivoId,
        String objetivoDescricao
) {
}
