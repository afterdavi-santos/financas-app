package com.financas.app.integracao;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

// Cliente da API pública do Banco Central (SGS - Sistema Gerenciador de
// Séries Temporais), série 12 = "Taxa de juros - CDI" (% ao dia). Gratuita,
// sem chave de acesso. Só publica valor para dias úteis (o próprio calendário
// de datas retornado já é o calendário de dias úteis, feriados inclusos).
@Slf4j
@Component
public class BcbCdiClient {

    private static final String URL_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados";
    private static final DateTimeFormatter FORMATO_BCB = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final RestClient restClient = RestClient.create();

    public record PontoCdi(LocalDate data, BigDecimal taxaPercentual) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PontoBruto(String data, String valor) {
    }

    // Busca os valores diários de CDI no intervalo [inicio, fim] (inclusive).
    // IMPORTANTE: quando não há NENHUM valor publicado no período pedido (ex.:
    // consultar "hoje" antes da publicação diária do BCB, que costuma sair só
    // no fim do dia), o BCB devolve HTTP 404 com um corpo de erro em vez de um
    // array vazio. Tratamos isso (e qualquer outra falha de rede/formato) como
    // "sem dado novo agora" em vez de deixar a exceção subir — sem isso, a
    // exceção não tratada acabava se manifestando pro front como um erro
    // genérico do jeito errado (chegou a aparecer como sessão expirada).
    public List<PontoCdi> buscarPeriodo(LocalDate inicio, LocalDate fim) {
        String url = URL_BASE + "?formato=json&dataInicial=" + inicio.format(FORMATO_BCB)
                + "&dataFinal=" + fim.format(FORMATO_BCB);
        try {
            PontoBruto[] pontos = restClient.get().uri(url).retrieve().body(PontoBruto[].class);
            if (pontos == null) {
                return List.of();
            }
            return List.of(pontos).stream()
                    .map(p -> new PontoCdi(
                            LocalDate.parse(p.data(), FORMATO_BCB),
                            new BigDecimal(p.valor())))
                    .toList();
        } catch (RestClientException e) {
            log.warn("Falha ao consultar CDI no Banco Central para [{}, {}]: {}", inicio, fim, e.getMessage());
            return List.of();
        }
    }

}
