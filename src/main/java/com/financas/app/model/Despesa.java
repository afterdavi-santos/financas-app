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
