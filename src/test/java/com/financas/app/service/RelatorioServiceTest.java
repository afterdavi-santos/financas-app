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

    @Test
    void deveCompararAnosAgregandoTotaisMensais() {
        for (int mes = 1; mes <= 12; mes++) {
            LocalDate inicio2025 = LocalDate.of(2025, mes, 1);
            when(rendaService.calcularTotalMes(1L, inicio2025)).thenReturn(new BigDecimal("1000"));
            when(despesaService.calcularTotalPorPeriodo(1L, inicio2025, inicio2025.withDayOfMonth(inicio2025.lengthOfMonth())))
                    .thenReturn(new BigDecimal("600"));

            LocalDate inicio2026 = LocalDate.of(2026, mes, 1);
            when(rendaService.calcularTotalMes(1L, inicio2026)).thenReturn(new BigDecimal("1200"));
            when(despesaService.calcularTotalPorPeriodo(1L, inicio2026, inicio2026.withDayOfMonth(inicio2026.lengthOfMonth())))
                    .thenReturn(new BigDecimal("700"));
        }

        List<ResumoAnual> resumos = relatorioService.compararAnos(1L, 2025, 2026);

        assertThat(resumos).hasSize(2);
        assertThat(resumos.get(0).ano()).isEqualTo(2025);
        assertThat(resumos.get(0).totalRenda()).isEqualByComparingTo("12000");
        assertThat(resumos.get(0).totalDespesas()).isEqualByComparingTo("7200");
        assertThat(resumos.get(0).economia()).isEqualByComparingTo("4800");

        assertThat(resumos.get(1).ano()).isEqualTo(2026);
        assertThat(resumos.get(1).totalRenda()).isEqualByComparingTo("14400");
        assertThat(resumos.get(1).totalDespesas()).isEqualByComparingTo("8400");
        assertThat(resumos.get(1).economia()).isEqualByComparingTo("6000");
    }

}
