package com.financas.app.dto;

import com.financas.app.model.enums.TipoCategoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoriaRequest(@NotBlank String nome, @NotNull TipoCategoria tipo) {
}
