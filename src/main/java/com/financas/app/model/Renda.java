package com.financas.app.model;

import com.financas.app.model.enums.TipoRenda;
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
@Table(name = "renda")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Renda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String descricao;

    private BigDecimal valor;

    /**
     * Primeiro dia do mês de referência (ex: 2026-07-01 para julho/2026).
     */
    private LocalDate mesReferencia;

    @Enumerated(EnumType.STRING)
    private TipoRenda tipo;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Não-nula quando esta renda nasceu (ou foi gerada automaticamente) com
    // tipo FIXA: liga esta linha à série recorrente mensal.
    @ManyToOne
    @JoinColumn(name = "recorrencia_id")
    private RecorrenciaRenda recorrencia;

}
