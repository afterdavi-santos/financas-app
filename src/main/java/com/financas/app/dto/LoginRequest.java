package com.financas.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// `email` leva teto porque a coluna é varchar(255): um e-mail maior não teria
// como existir no banco, então nem vale consultar. `senha` fica sem teto de
// propósito — quem já tem conta precisa conseguir entrar com a senha que
// cadastrou, e um limite novo aqui trancaria essa pessoa para fora.
public record LoginRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank String senha
) {
}
