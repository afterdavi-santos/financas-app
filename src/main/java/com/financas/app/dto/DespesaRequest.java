package com.financas.app.dto;

import com.financas.app.model.enums.FormaPagamento;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

// mesReferencia: opcional — só o Leitor de fatura preenche (mês em que a
// fatura é paga). Null em despesas manuais (mês que conta = mês de `data`).
//
// @Size(max = 255) espelha o varchar(255) da coluna. Sem ele, um texto maior
// só falha lá no INSERT, e o erro do banco vira 500.
//
// formaPagamento: opcional na API por compatibilidade — ausente vira DEBITO
// (o comportamento que o app tinha antes de existir esse campo).
//
// parcelas: quantidade de parcelas da compra, 1 a 12. `valor` é sempre o
// TOTAL da compra, nunca o da parcela — o service divide (ver
// DespesaService.criar). Só faz sentido no CREDITO; com DEBITO e parcelas > 1
// o service recusa, em vez de escolher em silêncio qual dos dois o usuário
// quis dizer.
public record DespesaRequest(
        @NotBlank @Size(max = 255) String descricao,
        @NotNull @Positive @Digits(integer = 11, fraction = 2) BigDecimal valor,
        @NotNull LocalDate data,
        @NotNull Long categoriaId,
        LocalDate mesReferencia,
        FormaPagamento formaPagamento,
        @Min(1) @Max(12) Integer parcelas
) {

    public FormaPagamento formaPagamentoOuPadrao() {
        return formaPagamento == null ? FormaPagamento.DEBITO : formaPagamento;
    }

    public int parcelasOuPadrao() {
        return parcelas == null ? 1 : parcelas;
    }
}
