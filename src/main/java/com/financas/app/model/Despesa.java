package com.financas.app.model;

import com.financas.app.model.enums.FormaPagamento;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "despesa")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Despesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String descricao;

    private BigDecimal valor;

    private LocalDate data;

    // Primeiro dia do mês de referência (ex: 2026-08-01 para agosto/2026).
    // Só preenchido quando a despesa vem do Leitor de fatura: é o mês em que
    // a fatura é paga, que pode ser diferente do mês de `data` (a data real
    // da compra). Null = despesa manual; o mês que conta pro orçamento é o
    // de `data` (fallback, ver DespesaSpecification.comPeriodo).
    private LocalDate mesReferencia;

    // DEBITO ou CREDITO. Não decide em que mês a despesa conta (isso é `data`
    // / `mesReferencia`) — é informação de como foi paga, e é o que habilita
    // o parcelamento.
    @Enumerated(EnumType.STRING)
    @Column(name = "forma_pagamento", length = 20, nullable = false)
    private FormaPagamento formaPagamento = FormaPagamento.DEBITO;

    // Parcelamento: uma compra em 3x vira TRÊS despesas, uma por mês, e não
    // uma despesa com rótulo "3x" — assim o orçamento dos meses seguintes já
    // conta a parcela. Numa despesa não parcelada os dois campos valem 1.
    @Column(name = "parcela_numero", nullable = false)
    private Integer parcelaNumero = 1;

    @Column(name = "parcelas_total", nullable = false)
    private Integer parcelasTotal = 1;

    // Amarra as parcelas da mesma compra. Vale o id da PRIMEIRA parcela do
    // grupo (ela inclusive), então não há sequence separada. Null = despesa
    // não parcelada.
    @Column(name = "parcelamento_id")
    private Long parcelamentoId;

    @ManyToOne
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Não-nula quando esta despesa nasceu (ou foi gerada automaticamente) numa
    // categoria FIXA: liga esta linha à série recorrente mensal.
    @ManyToOne
    @JoinColumn(name = "recorrencia_id")
    private RecorrenciaDespesa recorrencia;

}
