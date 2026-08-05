package com.financas.app.model;

import jakarta.persistence.Column;
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

import java.time.LocalDate;

// Representa a SÉRIE recorrente de uma despesa fixa (ex.: "Aluguel", nascida
// quando o usuário cria uma Despesa numa categoria FIXA) — não é ela mesma um
// lançamento; cada mês vira uma Despesa real própria, ligada aqui via
// Despesa.recorrencia. Enquanto `ativa`, o catch-up preenche os meses que
// faltam sob demanda (ver DespesaService.garantirRecorrenciasAteHoje).
@Entity
@Table(name = "recorrencia_despesa")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecorrenciaDespesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Pinada na criação da série: usada em TODA linha gerada pelo catch-up,
    // mesmo que o usuário edite a categoria de uma instância individual depois.
    @ManyToOne
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Column(nullable = false)
    private boolean ativa = true;

    // 1º dia do mês da despesa original que iniciou a série.
    private LocalDate dataInicio;

    // Dia-do-mês ORIGINAL (ex.: 31), fixo pela vida da série — usado no
    // catch-up em vez do dia da última linha gerada, pra não "encolher" pra
    // sempre depois de atravessar um mês curto (ex.: dia 31 -> fevereiro
    // vira 28/29 -> se relesse esse dia já reduzido, março ficaria preso
    // em 28/29 também, quando deveria voltar a 31).
    private int diaDoMes;

}
