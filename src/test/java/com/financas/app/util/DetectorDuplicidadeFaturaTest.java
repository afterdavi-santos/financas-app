package com.financas.app.util;

import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.util.DetectorDuplicidadeFatura.NivelDuplicata;
import com.financas.app.util.ParserFaturaNubank.ItemBrutoFatura;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DetectorDuplicidadeFaturaTest {

    private Categoria categoria(String nome) {
        Categoria categoria = new Categoria();
        categoria.setId(1L);
        categoria.setNome(nome);
        return categoria;
    }

    private Despesa despesa(String descricao, BigDecimal valor, LocalDate data, Categoria categoria) {
        Despesa despesa = new Despesa();
        despesa.setDescricao(descricao);
        despesa.setValor(valor);
        despesa.setData(data);
        despesa.setCategoria(categoria);
        return despesa;
    }

    @Test
    void deveDetectarNivelAltissimoQuandoDataValorEDescricaoBatemExato() {
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 7, 10), "Mercado Extra", new BigDecimal("50.00"));
        Despesa existente = despesa("Mercado Extra", new BigDecimal("50.00"), LocalDate.of(2026, 7, 10), categoria("Alimentação"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isEqualTo(NivelDuplicata.ALTISSIMA);
    }

    @Test
    void deveDetectarNivelAltoQuandoDataDiferePorAteDoisDias() {
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 7, 12), "Uber Trip 8x2f", new BigDecimal("22.70"));
        Despesa existente = despesa("Corrida de app diferente", new BigDecimal("22.70"), LocalDate.of(2026, 7, 10), categoria("Transporte"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isEqualTo(NivelDuplicata.ALTA);
    }

    @Test
    void deveDetectarNivelMedioQuandoValorBateEDescricaoParecidaNoMesmoMes() {
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 8, 1), "Anthropic* Claude Sub", new BigDecimal("114.48"));
        Despesa existente = despesa("Anthropic Claude Subscription", new BigDecimal("114.48"),
                LocalDate.of(2026, 8, 15), categoria("Assinaturas"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isEqualTo(NivelDuplicata.MEDIA);
    }

    @Test
    void naoDeveDetectarNivelMedioQuandoValorEDescricaoBatemMasMesForDiferente() {
        // Decisão do usuário: assinatura recorrente com o mesmo valor em
        // meses diferentes (ex.: Netflix cobrado em julho e em agosto) deixa
        // de contar como duplicata — evita falso positivo cruzando meses ao
        // reimportar uma fatura com datas em mais de um mês.
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 8, 1), "Anthropic* Claude Sub", new BigDecimal("114.48"));
        Despesa existente = despesa("Anthropic Claude Subscription", new BigDecimal("114.48"),
                LocalDate.of(2026, 7, 1), categoria("Assinaturas"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isNull();
    }

    @Test
    void naoDeveDetectarNivelAltoQuandoDataDiferePorAteDoisDiasMasCruzaMes() {
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 7, 2), "Uber Trip 8x2f", new BigDecimal("22.70"));
        Despesa existente = despesa("Corrida de app diferente", new BigDecimal("22.70"), LocalDate.of(2026, 6, 30), categoria("Transporte"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isNull();
    }

    @Test
    void deveDetectarDuplicataDeCandidataEmBlocoIgnorandoValorEOSufixoDeQuantidade() {
        // "Uber (3x)" é como o leitor de fatura salva uma despesa que juntou
        // 3 linhas equivalentes (ver LeitorFaturaModal.tsx), com o VALOR
        // sendo a soma das 3 — nunca vai bater com o valor de uma única
        // linha crua reimportada, então esse caso não pode exigir mesmoValor
        // (só descrição, sem o sufixo, + mesmo mês calendário do bloco).
        // Nível BLOCO (não MEDIA nem ALTISSIMA): confiança alta, mas sem
        // conferência de valor exato, então tem selo próprio.
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 7, 3), "Uber", new BigDecimal("22.70"));
        Despesa existente = despesa("Uber (3x)", new BigDecimal("68.10"), LocalDate.of(2026, 7, 28), categoria("Transporte"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isEqualTo(NivelDuplicata.BLOCO);
    }

    @Test
    void deveDetectarDuplicataDeCandidataEmBlocoNosExtremosDoMesmoMes() {
        // Dia 1 vs dia 28 do MESMO mês (27 dias de distância) — deve casar
        // mesmo estando longe em dias, porque o critério agora é "mesmo mês
        // calendário", não uma janela de dias corridos.
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 8, 1), "Uber", new BigDecimal("22.70"));
        Despesa existente = despesa("Uber (3x)", new BigDecimal("68.10"), LocalDate.of(2026, 8, 28), categoria("Transporte"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isEqualTo(NivelDuplicata.BLOCO);
    }

    @Test
    void naoDeveDetectarDuplicataDeCandidataEmBlocoDeMesDiferenteMesmoPertoNaData() {
        // Só 3 dias de distância (dentro da antiga janela de 31 dias), mas em
        // meses diferentes (30/jun vs 3/jul) — não deve casar, porque o
        // critério é mesmo mês calendário, não janela de dias corridos.
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 6, 30), "Uber", new BigDecimal("22.70"));
        Despesa existente = despesa("Uber (3x)", new BigDecimal("68.10"), LocalDate.of(2026, 7, 3), categoria("Transporte"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isNull();
    }

    @Test
    void naoDeveDetectarDuplicataSemNenhumCriterioBatendo() {
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 8, 1), "Loja Nova", new BigDecimal("999.99"));
        Despesa existente = despesa("Mercado Extra", new BigDecimal("50.00"), LocalDate.of(2026, 7, 10), categoria("Alimentação"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isNull();
    }

    @Test
    void deveSugerirCategoriaDeDespesaParecida() {
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 8, 5), "Dl*99 Ride", new BigDecimal("21.70"));
        Categoria transporte = categoria("Transporte");
        Despesa existente = despesa("Dl*99 Ride", new BigDecimal("15.00"), LocalDate.of(2026, 6, 1), transporte);

        Categoria sugerida = DetectorDuplicidadeFatura.sugerirCategoria(item, List.of(existente));

        assertThat(sugerida).isEqualTo(transporte);
    }

    @Test
    void naoDeveSugerirCategoriaSemDespesaParecidaOSuficiente() {
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 8, 5), "Loja Completamente Diferente Ltda", new BigDecimal("21.70"));
        Despesa existente = despesa("Dl*99 Ride", new BigDecimal("15.00"), LocalDate.of(2026, 6, 1), categoria("Transporte"));

        Categoria sugerida = DetectorDuplicidadeFatura.sugerirCategoria(item, List.of(existente));

        assertThat(sugerida).isNull();
    }

    @Test
    void deveDetectarAltissimaAoReimportarDespesaJaSalvaComPrefixoCredito() {
        // Toda despesa vinda do leitor de fatura é salva com "(Crédito) " na
        // frente (ver LeituraFaturaService) — sem ignorar esse prefixo na
        // comparação, a linha crua reimportada (sem o prefixo) nunca bateria
        // como duplicata EXATA contra a despesa já salva.
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 7, 27), "Isla Costa Nunes", new BigDecimal("15.00"));
        Despesa existente = despesa("(Crédito) Isla Costa Nunes", new BigDecimal("15.00"),
                LocalDate.of(2026, 7, 27), categoria("Outros"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isEqualTo(NivelDuplicata.ALTISSIMA);
    }

    @Test
    void deveDetectarBlocoAoReimportarBlocoJaSalvoComPrefixoCredito() {
        ItemBrutoFatura item = new ItemBrutoFatura(
                LocalDate.of(2026, 7, 3), "Uber", new BigDecimal("22.70"));
        Despesa existente = despesa("(Crédito) Uber (3x)", new BigDecimal("68.10"),
                LocalDate.of(2026, 7, 28), categoria("Transporte"));

        NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, List.of(existente));

        assertThat(nivel).isEqualTo(NivelDuplicata.BLOCO);
    }

}
