package com.financas.app.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

// O @Size é o par do teto de listagem (MED-007): sem ele, uma única
// requisição grava um número arbitrário de despesas, e é assim que alguém
// infla a própria base até tornar toda listagem cara. 500 é bem acima de
// qualquer fatura real — o Leitor de fatura manda dezenas de itens, não
// centenas.
public record DespesaLoteRequest(
        @NotEmpty @Size(max = 500) @Valid List<DespesaRequest> despesas
) {
}
