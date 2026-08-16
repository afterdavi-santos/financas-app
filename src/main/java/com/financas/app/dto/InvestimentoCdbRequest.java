package com.financas.app.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

// percentualCdi não é dinheiro, é percentual (ex.: 105 = 105% do CDI), então
// leva um teto próprio e bem mais apertado que o dos valores monetários. Uma
// aplicação a 10.500% do CDI não existe — é digitação errada, e o teto menor
// transforma isso num 400 claro em vez de um rendimento fantasioso.
public record InvestimentoCdbRequest(
        @NotBlank @Size(max = 255) String descricao,
        @NotNull @Positive @Digits(integer = 11, fraction = 2) BigDecimal valorAplicado,
        @NotNull @Positive @Digits(integer = 5, fraction = 2) BigDecimal percentualCdi,
        @NotNull LocalDate dataAplicacao
) {
}
