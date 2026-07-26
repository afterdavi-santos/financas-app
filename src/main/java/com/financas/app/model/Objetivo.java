package com.financas.app.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "objetivo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Objetivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String descricao;

    // Mini descrição opcional: um incentivo/motivação para lembrar por que a meta importa.
    private String incentivo;

    private BigDecimal valorAlvo;

    private BigDecimal valorAtual;

    private LocalDate dataAlvo;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Vínculo opcional com um investimento CDB: quando presente, o progresso
    // da meta (valorAtual) passa a ser a posição ATUAL do investimento (ao
    // vivo), em vez do saldo acumulado por aportes manuais. Único por
    // investimento — um CDB só pode contar para uma meta ao mesmo tempo.
    @OneToOne
    @JoinColumn(name = "investimento_cdb_id", unique = true)
    private InvestimentoCdb investimentoCdb;

}
