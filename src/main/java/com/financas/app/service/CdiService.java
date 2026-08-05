package com.financas.app.service;

import com.financas.app.integracao.BcbCdiClient;
import com.financas.app.model.CdiDiario;
import com.financas.app.repository.CdiDiarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

// Cache local + acesso à taxa CDI diária (Banco Central, série SGS 12).
// A tabela cdi_diario guarda só dias úteis (o BCB não publica fim de semana
// nem feriado), então ela funciona como o próprio calendário de dias úteis —
// não precisamos manter uma lista de feriados à parte.
@Service
public class CdiService {

    private final CdiDiarioRepository cdiRepository;
    private final BcbCdiClient bcbCdiClient;

    // Evita bater no BCB de novo a cada requisição quando uma data (tipicamente
    // "hoje") ainda não tem valor publicado: se já tentamos buscar até essa
    // data recentemente e não veio nada novo, esperamos o cooldown passar antes
    // de tentar de novo. Isso é o que deixa a tela rápida na prática — sem
    // isso, toda consulta de posição/CDI batia na API externa de novo.
    private final Map<LocalDate, Instant> tentativasSemDadoNovo = new ConcurrentHashMap<>();
    private static final Duration COOLDOWN_TENTATIVA = Duration.ofMinutes(20);

    // Backfills grandes (ex.: investimento aplicado há vários anos) são
    // quebrados em pedaços de ~1 ano em vez de uma chamada única cobrindo
    // tudo: se um pedaço falhar (rede, timeout), só ELE entra em cooldown —
    // os outros pedaços continuam sendo tentados/salvos normalmente, em vez
    // de o histórico inteiro ficar bloqueado por causa de uma falha pontual.
    private static final int TAMANHO_CHUNK_DIAS = 365;

    public CdiService(CdiDiarioRepository cdiRepository, BcbCdiClient bcbCdiClient) {
        this.cdiRepository = cdiRepository;
        this.bcbCdiClient = bcbCdiClient;
    }

    // Taxa diária mais recente disponível (para exibir "CDI atual" no front).
    public Optional<CdiDiario> taxaMaisRecente() {
        LocalDate hoje = LocalDate.now();
        garantirCache(hoje.minusDays(10), hoje);
        return cdiRepository.findTopByOrderByDataDesc();
    }

    // Fator acumulado do CDI (produto de 1 + taxa/100) nos dias úteis
    // ESTRITAMENTE APÓS dataAplicacao até dataFim (inclusive). O dia da
    // aplicação em si não rende (convenção padrão de CDB: começa a render D+1).
    public BigDecimal fatorAcumulado(LocalDate dataAplicacao, LocalDate dataFim) {
        garantirCache(dataAplicacao, dataFim);
        List<CdiDiario> dias = cdiRepository.findByDataBetweenOrderByDataAsc(
                dataAplicacao.plusDays(1), dataFim);
        BigDecimal fator = BigDecimal.ONE;
        for (CdiDiario dia : dias) {
            BigDecimal fatorDoDia = BigDecimal.ONE.add(
                    dia.getTaxaPercentual().divide(BigDecimal.valueOf(100), MathContext.DECIMAL64));
            fator = fator.multiply(fatorDoDia, MathContext.DECIMAL64);
        }
        return fator;
    }

    // Quantidade de dias úteis com CDI publicado no período (para exibir ao usuário).
    public int diasUteisComRendimento(LocalDate dataAplicacao, LocalDate dataFim) {
        garantirCache(dataAplicacao, dataFim);
        return cdiRepository.findByDataBetweenOrderByDataAsc(dataAplicacao.plusDays(1), dataFim).size();
    }

    // Garante que a tabela local cobre o intervalo pedido, buscando no BCB só
    // o que ainda falta (extremos do que já está em cache), para não bater na
    // API externa a cada chamada.
    private void garantirCache(LocalDate inicio, LocalDate fim) {
        if (inicio.isAfter(fim)) {
            return;
        }
        Optional<CdiDiario> maisAntigo = cdiRepository.findTopByOrderByDataAsc();
        Optional<CdiDiario> maisRecente = cdiRepository.findTopByOrderByDataDesc();

        if (maisAntigo.isEmpty()) {
            salvarPeriodo(inicio, fim);
            return;
        }
        if (inicio.isBefore(maisAntigo.get().getData())) {
            salvarPeriodo(inicio, maisAntigo.get().getData().minusDays(1));
        }
        if (fim.isAfter(maisRecente.get().getData())) {
            salvarPeriodo(maisRecente.get().getData().plusDays(1), fim);
        }
    }

    private void salvarPeriodo(LocalDate inicio, LocalDate fim) {
        if (inicio.isAfter(fim)) {
            return;
        }
        LocalDate inicioChunk = inicio;
        while (!inicioChunk.isAfter(fim)) {
            LocalDate fimChunk = inicioChunk.plusDays(TAMANHO_CHUNK_DIAS - 1);
            if (fimChunk.isAfter(fim)) {
                fimChunk = fim;
            }
            salvarChunk(inicioChunk, fimChunk);
            inicioChunk = fimChunk.plusDays(1);
        }
    }

    private void salvarChunk(LocalDate inicio, LocalDate fim) {
        Instant ultimaTentativa = tentativasSemDadoNovo.get(fim);
        if (ultimaTentativa != null && Duration.between(ultimaTentativa, Instant.now()).compareTo(COOLDOWN_TENTATIVA) < 0) {
            return;
        }
        List<BcbCdiClient.PontoCdi> pontos = bcbCdiClient.buscarPeriodo(inicio, fim);
        if (pontos.isEmpty()) {
            tentativasSemDadoNovo.put(fim, Instant.now());
            return;
        }
        tentativasSemDadoNovo.remove(fim);
        List<CdiDiario> registros = pontos.stream()
                .map(p -> new CdiDiario(p.data(), p.taxaPercentual().setScale(6, RoundingMode.HALF_UP)))
                .toList();
        cdiRepository.saveAll(registros);
    }

}
