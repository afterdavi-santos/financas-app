package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// `investimentoCdbId`/`investimentoCdbDescricao` só vêm preenchidos quando o
// objetivo está vinculado a um investimento — nesse caso, `valorAtual` é a
// posição ATUAL do investimento (calculada ao vivo), não o saldo de aportes.
public record ObjetivoResponse(Long id, String descricao, String incentivo, BigDecimal valorAlvo, BigDecimal valorAtual,
                                LocalDate dataAlvo, Long investimentoCdbId, String investimentoCdbDescricao) {
}
