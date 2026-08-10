package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// id é sintético (posição na lista da resposta) — só pro frontend rastrear
// seleção, nada persiste até o usuário confirmar via POST /despesas/lote.
// nivelDuplicata: "ALTISSIMA" | "ALTA" | "MEDIA" | null (sem sinal de duplicata).
// data: data real da compra (do CSV), sempre preservada. mesReferencia: mês
// selecionado na tela ao abrir o leitor — igual para todos os itens da
// resposta, é o mês que vai contar no orçamento (não necessariamente o mês
// de `data`, já que uma fatura real cruza dois meses de calendário).
public record ItemFaturaExtraidoResponse(
        Long id,
        LocalDate data,
        LocalDate mesReferencia,
        String descricao,
        BigDecimal valor,
        Long categoriaSugeridaId,
        String categoriaSugeridaNome,
        String nivelDuplicata
) {
}
