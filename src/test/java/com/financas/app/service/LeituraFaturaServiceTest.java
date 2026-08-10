package com.financas.app.service;

import com.financas.app.dto.ProcessarFaturaResponse;
import com.financas.app.exception.FaturaInvalidaException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeituraFaturaServiceTest {

    @Mock
    private DespesaService despesaService;

    private LeituraFaturaService leituraFaturaService;

    @BeforeEach
    void setUp() {
        leituraFaturaService = new LeituraFaturaService(despesaService);
    }

    private MockMultipartFile arquivoCsv(String conteudo) {
        return new MockMultipartFile("arquivo", "fatura.csv", "text/csv",
                conteudo.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void deveProcessarFaturaSemDuplicatas() {
        when(despesaService.listarPorDataReal(anyLong(), any(), any())).thenReturn(List.of());
        String conteudo = """
                date,title,amount
                2026-08-01,Dl*99 Ride,"7,56"
                """;

        ProcessarFaturaResponse resposta = leituraFaturaService.processar(1L, arquivoCsv(conteudo), "2026-08");

        assertThat(resposta.itens()).hasSize(1);
        assertThat(resposta.itens().get(0).nivelDuplicata()).isNull();
        assertThat(resposta.itens().get(0).categoriaSugeridaId()).isNull();
        assertThat(resposta.itens().get(0).id()).isEqualTo(1L);
        assertThat(resposta.ignorados()).isEmpty();
    }

    @Test
    void deveMarcarNivelDeDuplicataEIdSequencial() {
        Categoria transporte = new Categoria();
        transporte.setId(9L);
        transporte.setNome("Transporte");
        Despesa existente = new Despesa();
        existente.setDescricao("Dl*99 Ride");
        existente.setValor(new BigDecimal("7.56"));
        existente.setData(LocalDate.of(2026, 8, 1));
        existente.setCategoria(transporte);

        when(despesaService.listarPorDataReal(anyLong(), any(), any())).thenReturn(List.of(existente));
        String conteudo = """
                date,title,amount
                2026-08-01,Dl*99 Ride,"7,56"
                2026-08-02,Outra Loja,"10,00"
                """;

        ProcessarFaturaResponse resposta = leituraFaturaService.processar(1L, arquivoCsv(conteudo), "2026-08");

        assertThat(resposta.itens()).hasSize(2);
        assertThat(resposta.itens().get(0).nivelDuplicata()).isEqualTo("ALTISSIMA");
        assertThat(resposta.itens().get(0).id()).isEqualTo(1L);
        assertThat(resposta.itens().get(1).id()).isEqualTo(2L);
    }

    @Test
    void deveSepararLinhasNegativasComoIgnoradas() {
        when(despesaService.listarPorDataReal(anyLong(), any(), any())).thenReturn(List.of());
        String conteudo = """
                date,title,amount
                2026-07-03,Pagamento recebido,"- 2.095,68"
                2026-07-05,"Estorno de ""Dl*99 Ride"" (99)","- 3,00"
                2026-07-08,Mercado,"50,00"
                """;

        ProcessarFaturaResponse resposta = leituraFaturaService.processar(1L, arquivoCsv(conteudo), "2026-07");

        assertThat(resposta.itens()).hasSize(1);
        assertThat(resposta.itens().get(0).descricao()).isEqualTo("(Crédito) Mercado");
        assertThat(resposta.ignorados()).hasSize(2);
        assertThat(resposta.ignorados()).extracting("descricao")
                .containsExactlyInAnyOrder("Pagamento recebido", "Estorno de \"Dl*99 Ride\" (99)");
        assertThat(resposta.ignorados().get(0).motivo()).isNotBlank();
    }

    @Test
    void deveDevolverSoIgnoradosQuandoNaoHaLinhaPositiva() {
        String conteudo = """
                date,title,amount
                2026-07-03,Pagamento recebido,"- 2.095,68"
                """;

        ProcessarFaturaResponse resposta = leituraFaturaService.processar(1L, arquivoCsv(conteudo), "2026-07");

        assertThat(resposta.itens()).isEmpty();
        assertThat(resposta.ignorados()).hasSize(1);
    }

    @Test
    void deveIncluirItensDeMesDiferenteComMesReferenciaDoMesSelecionado() {
        // Regra de negócio: TODA despesa da fatura conta no mês em que a
        // fatura está sendo paga/subida (o mês selecionado na página), não
        // no mês da data real da compra — uma fatura real cruza dois meses
        // de calendário, então nenhum item é descartado por causa disso. A
        // data real continua preservada em `data`.
        when(despesaService.listarPorDataReal(anyLong(), any(), any())).thenReturn(List.of());
        String conteudo = """
                date,title,amount
                2026-07-28,Uber,"22,70"
                2026-08-05,Mercado,"50,00"
                """;

        ProcessarFaturaResponse resposta = leituraFaturaService.processar(1L, arquivoCsv(conteudo), "2026-08");

        assertThat(resposta.itens()).hasSize(2);
        assertThat(resposta.ignorados()).isEmpty();
        assertThat(resposta.itens()).extracting("mesReferencia")
                .containsOnly(LocalDate.of(2026, 8, 1));
        assertThat(resposta.itens()).extracting("data")
                .containsExactlyInAnyOrder(LocalDate.of(2026, 7, 28), LocalDate.of(2026, 8, 5));
        assertThat(resposta.itens()).extracting("descricao")
                .containsExactlyInAnyOrder("(Crédito) Uber", "(Crédito) Mercado");
    }

    @Test
    void deveFalharComMesInvalido() {
        String conteudo = """
                date,title,amount
                2026-08-01,Mercado,"50,00"
                """;

        assertThatThrownBy(() -> leituraFaturaService.processar(1L, arquivoCsv(conteudo), "mes-invalido"))
                .isInstanceOf(FaturaInvalidaException.class);
    }

    @Test
    void deveBuscarCandidatasComFolgaSimetricaDeNoventaDiasParaTrasEParaFrente() {
        when(despesaService.listarPorDataReal(anyLong(), any(), any())).thenReturn(List.of());
        String conteudo = """
                date,title,amount
                2026-07-05,Mercado,"50,00"
                2026-07-20,Farmacia,"30,00"
                """;

        leituraFaturaService.processar(1L, arquivoCsv(conteudo), "2026-07");

        // dataMaisAntiga = 2026-07-05, dataMaisRecente = 2026-07-20 — a busca
        // de candidatas precisa ter folga de 90 dias pros dois lados, não só
        // pra trás, senão um bloco "(Nx)" salvo com data logo depois de
        // 2026-07-20 ficaria fora da janela. Usa a data REAL (não o mês
        // efetivo), por isso listarPorDataReal em vez de listar.
        verify(despesaService).listarPorDataReal(eq(1L),
                eq(LocalDate.of(2026, 4, 6)), eq(LocalDate.of(2026, 10, 18)));
    }

    @Test
    void deveFalharSemArquivo() {
        assertThatThrownBy(() -> leituraFaturaService.processar(1L, null, "2026-08"))
                .isInstanceOf(FaturaInvalidaException.class);
    }

    @Test
    void deveFalharComExtensaoDiferenteDeCsv() {
        MockMultipartFile arquivo = new MockMultipartFile("arquivo", "fatura.pdf", "application/pdf",
                "conteudo".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> leituraFaturaService.processar(1L, arquivo, "2026-08"))
                .isInstanceOf(FaturaInvalidaException.class);
    }

    @Test
    void deveDevolverListaVaziaSemLinhasValidas() {
        String conteudo = "date,title,amount\n";

        ProcessarFaturaResponse resposta = leituraFaturaService.processar(1L, arquivoCsv(conteudo), "2026-08");

        assertThat(resposta.itens()).isEmpty();
        assertThat(resposta.ignorados()).isEmpty();
    }

}
