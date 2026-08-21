package com.financas.app.model.enums;

// Como a despesa foi paga. DEBITO ("à vista") sai da conta no mês em que
// aconteceu; CREDITO cai na fatura e pode ser dividido em até 12 parcelas
// (ver DespesaService.criar, que materializa uma Despesa por parcela).
//
// Default de tudo que já existia: DEBITO — ver V2__forma_pagamento_e_parcelamento.sql.
public enum FormaPagamento {
    DEBITO,
    CREDITO
}
