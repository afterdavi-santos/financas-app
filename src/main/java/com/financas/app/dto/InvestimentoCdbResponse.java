package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// `valorAplicado` é o principal AINDA investido (reduz a cada resgate parcial).
// `dataResgate` só é preenchida quando o investimento é totalmente liquidado.
public record InvestimentoCdbResponse(
        Long id,
        String descricao,
        BigDecimal valorAplicado,
        BigDecimal percentualCdi,
        LocalDate dataAplicacao,
        LocalDate dataResgate
) {
}
