package com.financas.app.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

// Quanto o usuário PENSA em resgatar. O cálculo de IOF/IR é feito em cima
// desse valor — nada é automático, é sempre o usuário quem informa antes.
public record SimulacaoResgateRequest(
        @NotNull @Positive @Digits(integer = 11, fraction = 2) BigDecimal valor
) {
}
