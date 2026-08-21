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

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "limite_categoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LimiteCategoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Teto de gasto da categoria durante a vigência desta linha.
    private BigDecimal valorLimite;

    // Vigência, no intervalo semiaberto [mesInicio, mesFim): o limite vale
    // para todo mês m com mesInicio <= m < mesFim. Sempre o primeiro dia do
    // mês (ex.: 2026-08-01 para agosto/2026).
    //
    // mesInicio: mês em que o limite foi criado — não vale para meses
    // anteriores a ele.
    @Column(name = "mes_inicio", nullable = false)
    private LocalDate mesInicio;

    // mesFim: primeiro mês em que o limite JÁ NÃO vale. Null = vigente. É
    // o que a exclusão preenche, em vez de apagar a linha: assim os meses
    // em que o teto realmente existiu continuam sabendo disso.
    @Column(name = "mes_fim")
    private LocalDate mesFim;

    @ManyToOne
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

}
