package com.financas.app.dto;

import java.util.List;

public record ProcessarFaturaResponse(
        List<ItemFaturaExtraidoResponse> itens,
        List<ItemIgnoradoResponse> ignorados
) {
}
