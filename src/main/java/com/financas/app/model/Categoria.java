package com.financas.app.model;

import com.financas.app.model.enums.TipoCategoria;
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

import java.time.LocalDateTime;

@Entity
@Table(name = "categoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;

    // Toda categoria é FIXA ou VARIAVEL; toda despesa lançada nela herda esse
    // tipo (não é mais escolhido por despesa individual).
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoCategoria tipo;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Null pra categorias criadas antes deste campo existir (nenhum backfill
    // foi feito) — usado pra saber se a categoria "nasceu" no mês em foco de
    // um relatório (ver RelatorioService/frontend despesasResumo.ts), não
    // pra nada crítico o suficiente pra exigir migração de dados antigos.
    private LocalDateTime dataCriacao;

}
