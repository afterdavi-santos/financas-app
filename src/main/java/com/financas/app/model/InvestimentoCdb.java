package com.financas.app.model;

import jakarta.persistence.Entity;
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

// Investimento em CDB acompanhado pelo app (rendimento calculado a partir do
// CDI real). Separado de Renda de propósito: só vira Renda (e só conta no
// total do mês) quando uma parte dele é efetivamente resgatada.
//
// É um CONTAINER de aportes (ver AporteCdb): o valor aplicado e a data de
// aplicação NÃO ficam aqui — cada aporte (o inicial e os feitos depois via
// "investir mais") é um lote próprio, com seu próprio relógio de rendimento
// e de dias corridos pra IOF/IR. Isso evita que aportar mais dinheiro apague
// o rendimento que já tinha se acumulado antes.
@Entity
@Table(name = "investimento_cdb")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InvestimentoCdb {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String descricao;

    // Percentual do CDI que o banco paga (ex.: 105 = 105% do CDI) — igual
    // pra todos os lotes deste investimento.
    private BigDecimal percentualCdi;

    // Preenchida quando TODOS os lotes chegam a zero (investimento
    // totalmente liquidado); null enquanto ainda houver saldo em algum lote.
    private LocalDate dataResgate;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

}
