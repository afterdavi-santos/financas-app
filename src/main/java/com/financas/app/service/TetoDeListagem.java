package com.financas.app.service;

import com.financas.app.exception.ResultadoExcessivoException;

// Teto único de linhas por listagem (MED-007 / CWE-770). Sem ele, um único GET
// com intervalo aberto — `?inicio=0001-01-01&fim=9999-12-31` — carrega a base
// inteira do usuário em memória de uma vez, e o custo cresce com o uso normal
// do app, sem ninguém precisar atacar nada.
//
// Duas decisões que valem o comentário:
//
// 1. A conferência é um COUNT no banco, feito antes do SELECT. Contar linhas
//    que não saem da tabela é barato; o que é caro é materializá-las em
//    entidades. Conferir depois de carregar não protegeria de nada.
//
// 2. Estourar o teto é 400, não uma página parcial. Toda tela que consome
//    estas listagens alimenta gráfico ou total (ver DespesasPage, HomePage,
//    RendasPage), então devolver um recorte silencioso trocaria um problema de
//    memória por números errados na tela — pior, porque ninguém percebe.
public final class TetoDeListagem {

    // 2000 lançamentos ≈ 5 anos de uso pesado (mais de 30 por mês). Alto o
    // bastante para nunca aparecer no uso real, baixo o bastante para o pior
    // caso caber em memória com folga.
    public static final int MAXIMO = 2000;

    private TetoDeListagem() {
    }

    public static void conferir(long encontradas) {
        if (encontradas > MAXIMO) {
            throw new ResultadoExcessivoException(
                    "O período pedido tem " + encontradas + " lançamentos, acima do máximo de "
                            + MAXIMO + " por consulta. Escolha um intervalo menor.");
        }
    }

}
