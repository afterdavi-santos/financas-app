package com.financas.app.repository;

import java.math.BigDecimal;

// Projection de "quanto foi gasto em cada categoria num periodo". Existe para a
// tela de Limites conseguir o gasto de TODAS as categorias numa consulta so, em
// vez de uma por limite (ver LimiteCategoriaService.listarComStatus).
public interface TotalPorCategoria {

    Long getCategoriaId();

    BigDecimal getTotal();

}
