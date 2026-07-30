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

// Um "lote" de dinheiro aplicado dentro de um InvestimentoCdb. Cada aporte
// (inclusive o primeiro, feito na criação) tem seu PRÓPRIO relógio de
// rendimento e de dias corridos (IOF/IR) — assim, aportar mais dinheiro
// nunca apaga o rendimento que os lotes anteriores já acumularam.
// `valorAplicado` é o principal AINDA restante NESTE lote (reduz a cada
// resgate que o consome, total ou parcialmente).
@Entity
@Table(name = "aporte_cdb")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AporteCdb {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private BigDecimal valorAplicado;

    private LocalDate dataAplicacao;

    @ManyToOne
    @JoinColumn(name = "investimento_cdb_id", nullable = false)
    private InvestimentoCdb investimento;

}
