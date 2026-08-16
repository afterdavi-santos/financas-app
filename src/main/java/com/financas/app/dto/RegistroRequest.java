package com.financas.app.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegistroRequest(
        @NotBlank @Size(max = 255) String nome,
        @NotBlank @Email @Size(max = 255) String email,
        // Mesma regra do AlterarSenhaRequest: min 8 para não permitir criar
        // conta com senha mais fraca do que a exigida na troca; max 72 porque
        // o BCrypt trunca silenciosamente a partir daí (o resto da senha seria
        // ignorado sem a pessoa saber).
        @NotBlank @Size(min = 8, max = 72) String senha,
        @AssertTrue(message = "É necessário aceitar os Termos de Uso e a Política de Privacidade")
        boolean aceitouTermos
) {
}
