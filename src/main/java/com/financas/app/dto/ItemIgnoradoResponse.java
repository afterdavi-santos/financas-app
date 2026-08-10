package com.financas.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// Linha da fatura que NÃO é uma despesa importável (valor <= 0 no CSV: já é
// um estorno, reembolso ou o próprio "Pagamento recebido" da fatura) —
// devolvida só pra transparência (o usuário consegue conferir o que foi
// descartado e por quê), nunca é enviada em POST /despesas/lote.
public record ItemIgnoradoResponse(
        LocalDate data,
        String descricao,
        BigDecimal valor,
        String motivo
) {
}
