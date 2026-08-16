package com.financas.app.dto;

import com.financas.app.model.enums.TipoCategoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoriaRequest(
        @NotBlank @Size(max = 255) String nome,
        @NotNull TipoCategoria tipo
) {
}
