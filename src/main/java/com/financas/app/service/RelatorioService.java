package com.financas.app.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class RelatorioService {

    private final RendaService rendaService;
    private final DespesaService despesaService;

    public RelatorioService(RendaService rendaService, DespesaService despesaService) {
        this.rendaService = rendaService;
        this.despesaService = despesaService;
    }

    public BigDecimal calcularEconomiaDoMes(Long usuarioId, LocalDate mesReferencia) {
        return calcularResumoMensal(usuarioId, mesReferencia).economia();
    }

    public List<ResumoMensal> compararMeses(Long usuarioId, LocalDate inicio, LocalDate fim) {
        List<ResumoMensal> resumos = new ArrayList<>();
        LocalDate mesAtual = inicio.withDayOfMonth(1);
        LocalDate ultimoMes = fim.withDayOfMonth(1);
        while (!mesAtual.isAfter(ultimoMes)) {
            resumos.add(calcularResumoMensal(usuarioId, mesAtual));
            mesAtual = mesAtual.plusMonths(1);
        }
        return resumos;
    }

    private ResumoMensal calcularResumoMensal(Long usuarioId, LocalDate mesReferencia) {
        LocalDate inicio = mesReferencia.withDayOfMonth(1);
        LocalDate fim = mesReferencia.withDayOfMonth(mesReferencia.lengthOfMonth());
        BigDecimal totalRenda = rendaService.calcularTotalMes(usuarioId, inicio);
        BigDecimal totalDespesas = despesaService.calcularTotalPorPeriodo(usuarioId, inicio, fim);
        return new ResumoMensal(inicio, totalRenda, totalDespesas, totalRenda.subtract(totalDespesas));
    }

}
