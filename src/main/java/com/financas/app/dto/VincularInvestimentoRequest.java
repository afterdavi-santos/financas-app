package com.financas.app.dto;

import jakarta.validation.constraints.NotNull;

public record VincularInvestimentoRequest(@NotNull Long investimentoCdbId) {
}
