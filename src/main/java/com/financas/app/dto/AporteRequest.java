package com.financas.app.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

// `data` é opcional: quando ausente, o serviço usa a data de hoje.
//
// @Digits(integer = 11, fraction = 2) é o teto de todo valor monetário da
// aplicação. A coluna no banco é numeric(38,2), ou seja, aceita um número com
// 36 dígitos inteiros sem reclamar — @Positive sozinho não barra isso. Um
// valor absurdo entra, soma no total do mês e distorce todo o resumo. 11
// dígitos dão até 99.999.999.999,99, folgado para finanças pessoais.
public record AporteRequest(
        @NotNull @Positive @Digits(integer = 11, fraction = 2) BigDecimal valor,
        LocalDate data
) {
}
