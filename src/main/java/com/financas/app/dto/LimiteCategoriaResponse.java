package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// mesInicio/mesFim expõem a vigência do limite (ver LimiteCategoria): ele vale
// para os meses em [mesInicio, mesFim), e mesFim nulo significa "ainda
// vigente".
//
// valorGasto/estourado só vêm preenchidos na LISTAGEM, que já calcula o status
// de todos os limites de uma vez. Nas respostas de criação e edição eles vêm
// nulos — não porque o dado seja indisponível, mas porque acabar de criar um
// limite não diz nada sobre o mês, e calcular ali custaria uma consulta a mais
// para um número que a tela recarrega em seguida.
public record LimiteCategoriaResponse(
        Long id,
        BigDecimal valorLimite,
        CategoriaResponse categoria,
        LocalDate mesInicio,
        LocalDate mesFim,
        BigDecimal valorGasto,
        Boolean estourado
) {
}
