package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// mesInicio/mesFim expõem a vigência do limite (ver LimiteCategoria): ele vale
// para os meses em [mesInicio, mesFim), e mesFim nulo significa "ainda
// vigente". O front usa isso para não sugerir editar/excluir um limite fora do
// mês em que ele realmente vale.
public record LimiteCategoriaResponse(
        Long id,
        BigDecimal valorLimite,
        CategoriaResponse categoria,
        LocalDate mesInicio,
        LocalDate mesFim
) {
}
