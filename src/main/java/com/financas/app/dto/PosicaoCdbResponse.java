package com.financas.app.dto;

import java.math.BigDecimal;

// Posição atual (ainda não resgatada) de um CDB: quanto vale hoje e quanto
// já rendeu, calculado a partir do CDI acumulado desde a aplicação.
public record PosicaoCdbResponse(
        BigDecimal valorAplicado,
        BigDecimal valorAtual,
        BigDecimal rendimentoBruto,
        int diasCorridos,
        int diasUteisRendidos
) {
}
