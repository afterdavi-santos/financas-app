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

// Equivalente a RecorrenciaDespesa, mas para Renda com tipo FIXA (ex.:
// salário). Renda não tem categoria, e mesReferencia é sempre dia 1, então
// não precisa de um "diaDoMes" pra clampar.
@Entity
@Table(name = "recorrencia_renda")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecorrenciaRenda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private boolean ativa = true;

    // 1º dia do mês (mesReferencia) da renda original que iniciou a série.
    private LocalDate dataInicio;

}
