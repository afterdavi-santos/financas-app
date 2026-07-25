package com.financas.app.dto;

import java.math.BigDecimal;

// Prévia do resgate (PARCIAL ou total) de um investimento CDB.
// `valorLiquido` é o que o usuário PEDIU para receber (ou, no resgate total,
// o máximo que sobra após os impostos) — é sempre o valor que efetivamente
// cai na conta. `valorBrutoRetirado` é quanto sai de fato da posição para
// cobrir esse líquido + os impostos: sempre >= valorLiquido, porque quem
// "absorve" o imposto é o saldo que resta investido, não o valor recebido.
public record SimulacaoResgateResponse(
        BigDecimal valorAtual,
        BigDecimal valorBrutoRetirado,
        BigDecimal rendimentoProporcional,
        int diasCorridos,
        BigDecimal percentualIof,
        BigDecimal valorIof,
        BigDecimal percentualIr,
        BigDecimal valorIr,
        BigDecimal valorLiquido
) {
}
