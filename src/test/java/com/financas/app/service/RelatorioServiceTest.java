package com.financas.app.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RelatorioServiceTest {

    @Mock
    private RendaService rendaService;

    @Mock
    private DespesaService despesaService;

    private RelatorioService relatorioService;

    @BeforeEach
    void setUp() {
        relatorioService = new RelatorioService(rendaService, despesaService);
    }

    @Test
    void deveCalcularEconomiaPositivaQuandoRendaMaiorQueDespesas() {
        LocalDate julho = LocalDate.of(2026, 7, 15);
        when(rendaService.calcularTotalMes(1L, LocalDate.of(2026, 7, 1))).thenReturn(new BigDecimal("3000"));
        when(despesaService.calcularTotalPorPeriodo(1L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .thenReturn(new BigDecimal("2000"));

        BigDecimal economia = relatorioService.calcularEconomiaDoMes(1L, julho);

        assertThat(economia).isEqualByComparingTo("1000");
    }

    @Test
    void deveCalcularEconomiaNegativaQuandoDespesasMaioresQueRenda() {
        LocalDate julho = LocalDate.of(2026, 7, 1);
        when(rendaService.calcularTotalMes(1L, julho)).thenReturn(new BigDecimal("1000"));
        when(despesaService.calcularTotalPorPeriodo(1L, julho, LocalDate.of(2026, 7, 31)))
                .thenReturn(new BigDecimal("1500"));

        BigDecimal economia = relatorioService.calcularEconomiaDoMes(1L, julho);

        assertThat(economia).isEqualByComparingTo("-500");
    }

    @Test
    void deveCompararMesesGerandoUmResumoPorMes() {
        when(rendaService.calcularTotalMes(1L, LocalDate.of(2026, 6, 1))).thenReturn(new BigDecimal("3000"));
        when(despesaService.calcularTotalPorPeriodo(1L, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30)))
                .thenReturn(new BigDecimal("2000"));

        when(rendaService.calcularTotalMes(1L, LocalDate.of(2026, 7, 1))).thenReturn(new BigDecimal("3200"));
        when(despesaService.calcularTotalPorPeriodo(1L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .thenReturn(new BigDecimal("2500"));

        List<ResumoMensal> resumos = relatorioService.compararMeses(1L,
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 7, 31));

        assertThat(resumos).hasSize(2);
        assertThat(resumos.get(0).mes()).isEqualTo(LocalDate.of(2026, 6, 1));
        assertThat(resumos.get(0).economia()).isEqualByComparingTo("1000");
        assertThat(resumos.get(1).mes()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(resumos.get(1).economia()).isEqualByComparingTo("700");
    }

}
