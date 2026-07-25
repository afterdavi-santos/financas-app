package com.financas.app.web;

import com.financas.app.dto.CdiAtualResponse;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.CdiDiario;
import com.financas.app.service.CdiService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.MathContext;

// Endpoint público (autenticado) para consultar a taxa CDI mais recente —
// usado no front para mostrar "CDI atual" ao cadastrar um investimento CDB.
@RestController
@RequestMapping("/api/cdi")
public class CdiController {

    private final CdiService cdiService;

    public CdiController(CdiService cdiService) {
        this.cdiService = cdiService;
    }

    @GetMapping("/atual")
    public CdiAtualResponse atual() {
        CdiDiario diario = cdiService.taxaMaisRecente()
                .orElseThrow(() -> new RecursoNaoEncontradoException("Taxa CDI", 0L));
        BigDecimal taxaDiaria = diario.getTaxaPercentual();
        // Anualiza: (1 + taxaDiaria/100)^252 - 1 (base 252 dias úteis/ano).
        double fatorDiario = 1 + taxaDiaria.doubleValue() / 100.0;
        double taxaAnualizada = (Math.pow(fatorDiario, 252) - 1) * 100;
        return new CdiAtualResponse(diario.getData(), taxaDiaria,
                BigDecimal.valueOf(taxaAnualizada).round(new MathContext(4)));
    }

}
