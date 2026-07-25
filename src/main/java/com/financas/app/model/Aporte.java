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

// Cada aporte é um depósito individual feito num objetivo (antes eram apenas
// somados em Objetivo.valorAtual). Guardar cada um permite listar a linha do
// tempo e editar/remover um aporte específico.
@Entity
@Table(name = "aporte")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Aporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private BigDecimal valor;

    private LocalDate data;

    @ManyToOne
    @JoinColumn(name = "objetivo_id", nullable = false)
    private Objetivo objetivo;

}
