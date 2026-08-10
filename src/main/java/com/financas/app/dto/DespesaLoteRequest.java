package com.financas.app.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record DespesaLoteRequest(
        @NotEmpty @Valid List<DespesaRequest> despesas
) {
}
