package com.financas.app.service;

import com.financas.app.model.LimiteCategoria;

import java.math.BigDecimal;

/**
 * Um limite vigente junto do quanto ja foi gasto na categoria naquele mes.
 *
 * <p>Existe para a listagem devolver as duas coisas de uma vez: antes a tela
 * pedia a lista e, para cada limite, uma segunda requisicao com o status — um
 * N+1 de REDE, onde cada viagem paga a latencia inteira.
 */
public record LimiteComStatus(LimiteCategoria limite, BigDecimal valorGasto, boolean estourado) {

    public static LimiteComStatus de(LimiteCategoria limite, BigDecimal valorGasto) {
        BigDecimal gasto = valorGasto == null ? BigDecimal.ZERO : valorGasto;
        return new LimiteComStatus(limite, gasto, gasto.compareTo(limite.getValorLimite()) > 0);
    }
}
