package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// Taxa CDI mais recente conhecida (Banco Central), para exibir ao usuário
// no momento de cadastrar um CDB. `taxaAnualizada` é aproximada:
// (1 + taxaDiaria/100)^252 - 1, base 252 dias úteis/ano.
public record CdiAtualResponse(LocalDate data, BigDecimal taxaDiariaPercentual, BigDecimal taxaAnualizadaPercentual) {
}
