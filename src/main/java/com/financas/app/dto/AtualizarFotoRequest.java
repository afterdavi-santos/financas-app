package com.financas.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// O teto de 2 MB da imagem é conferido no UsuarioService, depois de decodificar
// — é ele que vale, porque olha o tamanho real. O @Size aqui é um filtro
// anterior: base64 ocupa 4 bytes a cada 3 de dado, então 2 MB decodificados dão
// ~2,8 MB de texto. Barrar antes evita alocar um byte[] gigante só para
// descobrir na linha seguinte que ele é grande demais.
public record AtualizarFotoRequest(
        @NotBlank @Size(max = 2_800_000) String fotoBase64,
        @NotBlank @Size(max = 255) String tipo
) {
}
