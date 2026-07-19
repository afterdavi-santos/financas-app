package com.financas.app.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

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

    public List<ResumoAnual> compararAnos(Long usuarioId, int anoInicio, int anoFim) {
        List<ResumoMensal> resumosMensais = compararMeses(usuarioId,
                LocalDate.of(anoInicio, 1, 1), LocalDate.of(anoFim, 12, 1));

        Map<Integer, List<ResumoMensal>> porAno = resumosMensais.stream()
                .collect(Collectors.groupingBy(resumo -> resumo.mes().getYear(), TreeMap::new, Collectors.toList()));

        return porAno.entrySet().stream()
                .map(entry -> {
                    BigDecimal totalRenda = somar(entry.getValue(), ResumoMensal::totalRenda);
                    BigDecimal totalDespesas = somar(entry.getValue(), ResumoMensal::totalDespesas);
                    return new ResumoAnual(entry.getKey(), totalRenda, totalDespesas, totalRenda.subtract(totalDespesas));
                })
                .toList();
    }

    private ResumoMensal calcularResumoMensal(Long usuarioId, LocalDate mesReferencia) {
        LocalDate inicio = mesReferencia.withDayOfMonth(1);
        LocalDate fim = mesReferencia.withDayOfMonth(mesReferencia.lengthOfMonth());
        BigDecimal totalRenda = rendaService.calcularTotalMes(usuarioId, inicio);
        BigDecimal totalDespesas = despesaService.calcularTotalPorPeriodo(usuarioId, inicio, fim);
        return new ResumoMensal(inicio, totalRenda, totalDespesas, totalRenda.subtract(totalDespesas));
    }

    private BigDecimal somar(List<ResumoMensal> resumos, java.util.function.Function<ResumoMensal, BigDecimal> extrator) {
        return resumos.stream().map(extrator).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

}
