package com.financas.app.web;

import com.financas.app.dto.TotalResponse;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.RelatorioService;
import com.financas.app.service.ResumoAnual;
import com.financas.app.service.ResumoMensal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {

    private final RelatorioService relatorioService;

    public RelatorioController(RelatorioService relatorioService) {
        this.relatorioService = relatorioService;
    }

    @GetMapping("/economia")
    public TotalResponse economia(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate mesReferencia) {
        return new TotalResponse(relatorioService.calcularEconomiaDoMes(usuarioAutenticado.getId(), mesReferencia));
    }

    @GetMapping("/comparar-meses")
    public List<ResumoMensal> compararMeses(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return relatorioService.compararMeses(usuarioAutenticado.getId(), inicio, fim);
    }

    @GetMapping("/comparar-anos")
    public List<ResumoAnual> compararAnos(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                           @RequestParam int anoInicio,
                                           @RequestParam int anoFim) {
        return relatorioService.compararAnos(usuarioAutenticado.getId(), anoInicio, anoFim);
    }

}
