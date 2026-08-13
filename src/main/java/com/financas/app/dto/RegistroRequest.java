package com.financas.app.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegistroRequest(
        @NotBlank String nome,
        @NotBlank @Email String email,
        @NotBlank String senha,
        @AssertTrue(message = "É necessário aceitar os Termos de Uso e a Política de Privacidade")
        boolean aceitouTermos
) {
}
