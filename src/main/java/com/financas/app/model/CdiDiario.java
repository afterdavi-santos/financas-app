package com.financas.app.model;

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
    private BigDecimal taxaPercentual;

}
