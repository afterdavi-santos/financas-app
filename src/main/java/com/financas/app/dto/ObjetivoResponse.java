package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ObjetivoResponse(Long id, String descricao, BigDecimal valorAlvo, BigDecimal valorAtual, LocalDate dataAlvo) {
}
