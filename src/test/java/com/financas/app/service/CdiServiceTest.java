package com.financas.app.service;

import com.financas.app.integracao.BcbCdiClient;
import com.financas.app.model.CdiDiario;
import com.financas.app.repository.CdiDiarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CdiServiceTest {

    @Mock
    private CdiDiarioRepository cdiRepository;

    @Mock
    private BcbCdiClient bcbCdiClient;

    private CdiService cdiService;

    @BeforeEach
    void setUp() {
        cdiService = new CdiService(cdiRepository, bcbCdiClient);
    }

    private static CdiDiario dia(LocalDate data, String taxa) {
        return new CdiDiario(data, new BigDecimal(taxa));
    }

    @Test
    void fatorAcumuladoMultiplicaOsDiasUteisDoPeriodoSemBaterNoBcbQuandoJaEstaEmCache() {
        LocalDate aplicacao = LocalDate.of(2026, 7, 1);
        LocalDate fim = LocalDate.of(2026, 7, 3);
        // Cache já cobre [aplicacao, fim] inteiro -> não deve chamar o BCB.
        when(cdiRepository.findTopByOrderByDataAsc()).thenReturn(Optional.of(dia(aplicacao, "0.05")));
        when(cdiRepository.findTopByOrderByDataDesc()).thenReturn(Optional.of(dia(fim, "0.05")));
        when(cdiRepository.findByDataBetweenOrderByDataAsc(aplicacao.plusDays(1), fim)).thenReturn(List.of(
                dia(LocalDate.of(2026, 7, 2), "0.10"),
                dia(LocalDate.of(2026, 7, 3), "0.20")));

        BigDecimal fator = cdiService.fatorAcumulado(aplicacao, fim);

        // (1 + 0.10/100) * (1 + 0.20/100) = 1.0010 * 1.0020 = 1.00300...
        assertThat(fator.doubleValue()).isCloseTo(1.0010 * 1.0020, org.assertj.core.data.Offset.offset(1e-9));
        verify(bcbCdiClient, never()).buscarPeriodo(any(), any());
    }

    @Test
    void fatorAcumuladoIgnoraODiaDaAplicacao() {
        LocalDate aplicacao = LocalDate.of(2026, 7, 1);
        LocalDate fim = LocalDate.of(2026, 7, 1);
        when(cdiRepository.findTopByOrderByDataAsc()).thenReturn(Optional.of(dia(aplicacao, "0.05")));
        when(cdiRepository.findTopByOrderByDataDesc()).thenReturn(Optional.of(dia(fim, "0.05")));
        when(cdiRepository.findByDataBetweenOrderByDataAsc(aplicacao.plusDays(1), fim)).thenReturn(List.of());

        BigDecimal fator = cdiService.fatorAcumulado(aplicacao, fim);

        assertThat(fator).isEqualByComparingTo("1");
    }

    @Test
    void garantirCacheBuscaNoBcbQuandoFimEstaAlemDoQueJaFoiCacheado() {
        LocalDate maisRecenteCache = LocalDate.of(2026, 7, 1);
        LocalDate fimPedido = LocalDate.of(2026, 7, 5);
        when(cdiRepository.findTopByOrderByDataAsc()).thenReturn(Optional.of(dia(maisRecenteCache, "0.05")));
        when(cdiRepository.findTopByOrderByDataDesc()).thenReturn(Optional.of(dia(maisRecenteCache, "0.05")));
        when(bcbCdiClient.buscarPeriodo(maisRecenteCache.plusDays(1), fimPedido)).thenReturn(List.of(
                new BcbCdiClient.PontoCdi(LocalDate.of(2026, 7, 2), new BigDecimal("0.05"))));
        when(cdiRepository.findByDataBetweenOrderByDataAsc(maisRecenteCache.plusDays(1), fimPedido))
                .thenReturn(List.of(dia(LocalDate.of(2026, 7, 2), "0.05")));

        cdiService.fatorAcumulado(maisRecenteCache, fimPedido);

        verify(bcbCdiClient).buscarPeriodo(maisRecenteCache.plusDays(1), fimPedido);
        ArgumentCaptor<List<CdiDiario>> captor = ArgumentCaptor.forClass(List.class);
        verify(cdiRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
    }

    @Test
    void garantirCacheBuscaTudoNoBcbQuandoCacheEstaVazio() {
        LocalDate inicio = LocalDate.of(2026, 7, 1);
        LocalDate fim = LocalDate.of(2026, 7, 3);
        when(cdiRepository.findTopByOrderByDataAsc()).thenReturn(Optional.empty());
        when(bcbCdiClient.buscarPeriodo(inicio, fim)).thenReturn(List.of());
        when(cdiRepository.findByDataBetweenOrderByDataAsc(inicio.plusDays(1), fim)).thenReturn(List.of());

        cdiService.fatorAcumulado(inicio, fim);

        verify(bcbCdiClient).buscarPeriodo(inicio, fim);
    }

    private static final int TAMANHO_CHUNK_DIAS = 365;

    @Test
    void garantirCacheQuebraBackfillGrandeEmPedacosDeUmAno() {
        // Gap de exatamente 2 pedaços de 365 dias (cache vazio): deve virar 2
        // chamadas ao BCB, não uma única cobrindo tudo — assim, se um pedaço
        // falhar, o outro continua sendo tentado/salvo.
        LocalDate inicio = LocalDate.of(2024, 1, 1);
        LocalDate fim = inicio.plusDays(2L * TAMANHO_CHUNK_DIAS - 1);
        when(cdiRepository.findTopByOrderByDataAsc()).thenReturn(Optional.empty());
        when(bcbCdiClient.buscarPeriodo(any(), any())).thenReturn(List.of());
        when(cdiRepository.findByDataBetweenOrderByDataAsc(inicio.plusDays(1), fim)).thenReturn(List.of());

        cdiService.fatorAcumulado(inicio, fim);

        ArgumentCaptor<LocalDate> iniciosCaptor = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<LocalDate> finsCaptor = ArgumentCaptor.forClass(LocalDate.class);
        verify(bcbCdiClient, org.mockito.Mockito.times(2)).buscarPeriodo(iniciosCaptor.capture(), finsCaptor.capture());
        assertThat(iniciosCaptor.getAllValues().get(0)).isEqualTo(inicio);
        assertThat(finsCaptor.getAllValues().get(0)).isEqualTo(inicio.plusDays(TAMANHO_CHUNK_DIAS - 1));
        assertThat(iniciosCaptor.getAllValues().get(1)).isEqualTo(inicio.plusDays(TAMANHO_CHUNK_DIAS));
        assertThat(finsCaptor.getAllValues().get(1)).isEqualTo(fim);
    }

    @Test
    void garantirCacheContinuaProximoPedacoQuandoUmPedacoFalha() {
        // Primeiro pedaço "falha" (BCB devolve vazio); o segundo tem dado e
        // deve ser salvo mesmo assim — uma falha pontual não trava o resto.
        LocalDate inicio = LocalDate.of(2024, 1, 1);
        LocalDate fim = inicio.plusDays(2L * TAMANHO_CHUNK_DIAS - 1);
        LocalDate inicioSegundoChunk = inicio.plusDays(TAMANHO_CHUNK_DIAS);
        when(cdiRepository.findTopByOrderByDataAsc()).thenReturn(Optional.empty());
        when(bcbCdiClient.buscarPeriodo(inicio, inicio.plusDays(TAMANHO_CHUNK_DIAS - 1))).thenReturn(List.of());
        when(bcbCdiClient.buscarPeriodo(inicioSegundoChunk, fim)).thenReturn(List.of(
                new BcbCdiClient.PontoCdi(inicioSegundoChunk, new BigDecimal("0.05"))));
        when(cdiRepository.findByDataBetweenOrderByDataAsc(inicio.plusDays(1), fim)).thenReturn(List.of());

        cdiService.fatorAcumulado(inicio, fim);

        ArgumentCaptor<List<CdiDiario>> captor = ArgumentCaptor.forClass(List.class);
        verify(cdiRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
    }

    @Test
    void taxaMaisRecenteDevolveOUltimoValorEmCacheAposGarantirAtualizacao() {
        CdiDiario ultimo = dia(LocalDate.now(), "0.0525");
        when(cdiRepository.findTopByOrderByDataAsc()).thenReturn(Optional.of(ultimo));
        when(cdiRepository.findTopByOrderByDataDesc()).thenReturn(Optional.of(ultimo));

        Optional<CdiDiario> resultado = cdiService.taxaMaisRecente();

        assertThat(resultado).contains(ultimo);
    }

    @Test
    void diasUteisComRendimentoContaAsDatasCacheadasAposAAplicacao() {
        LocalDate aplicacao = LocalDate.of(2026, 7, 1);
        LocalDate fim = LocalDate.of(2026, 7, 10);
        when(cdiRepository.findTopByOrderByDataAsc()).thenReturn(Optional.of(dia(aplicacao, "0.05")));
        when(cdiRepository.findTopByOrderByDataDesc()).thenReturn(Optional.of(dia(fim, "0.05")));
        when(cdiRepository.findByDataBetweenOrderByDataAsc(aplicacao.plusDays(1), fim)).thenReturn(List.of(
                dia(LocalDate.of(2026, 7, 2), "0.05"),
                dia(LocalDate.of(2026, 7, 3), "0.05"),
                dia(LocalDate.of(2026, 7, 6), "0.05")));

        int dias = cdiService.diasUteisComRendimento(aplicacao, fim);

        assertThat(dias).isEqualTo(3);
    }

}
