package com.financas.app.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

// Cache local da taxa CDI diária (série SGS 12 do Banco Central). O BCB só
// publica valor para dias úteis, então as datas aqui presentes JÁ SÃO o
// calendário de dias úteis (sem precisar manter lista de feriados).
@Entity
@Table(name = "cdi_diario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CdiDiario {

    @Id
    private LocalDate data;

    // Taxa do dia em percentual (ex.: 0.052531 = 0,052531% ao dia).
    //
    // As 6 casas são obrigatórias, não preferência. Sem @Column o Hibernate usa
    // seu padrão para BigDecimal — numeric(38,2) —, e o Postgres arredonda na
    // gravação: 0,052531 vira 0,05. Como o CdiService compõe essa taxa dia após
    // dia, o erro se acumula: ~0,73 ponto percentual a menos em 1 ano, ~6,1 em
    // 5 anos, sempre para baixo. O .setScale(6) no CdiService:127 sempre supôs
    // esta precisão; faltava o banco concordar.
    //
    // ATENÇÃO: mudar esta anotação NÃO altera um banco que já existe. O
    // ddl-auto=update cria coluna que falta, mas nunca altera o tipo de uma
    // coluna existente — num banco antigo é preciso ALTER TABLE na mão
    // (e reimportar, porque os valores já gravados perderam as casas).
    @Column(precision = 9, scale = 6)
    private BigDecimal taxaPercentual;

}
