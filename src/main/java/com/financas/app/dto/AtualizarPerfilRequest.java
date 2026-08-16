package com.financas.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Mesmos tetos do RegistroRequest: os dois campos gravam nas mesmas colunas
// varchar(255) de `usuario`.
public record AtualizarPerfilRequest(
        @NotBlank @Size(max = 255) String nome,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank String senhaAtual
) {
}
