package com.financas.app.util;

import com.financas.app.exception.FaturaInvalidaException;
import com.financas.app.util.ParserFaturaNubank.ItemBrutoFatura;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Casos sintéticos que reproduzem o mesmo formato/pegadinhas do CSV real
// exportado pelo Nubank (colunas date,title,amount) — sem persistir dados
// financeiros reais do usuário no repositório.
class ParserFaturaNubankTest {

    private InputStream csv(String conteudo) {
        return new ByteArrayInputStream(conteudo.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void deveExtrairLinhasComValorPositivo() {
        String conteudo = """
                date,title,amount
                2026-08-01,Dl*99 Ride,"7,56"
                2026-07-27,Mp *Galegolanches,"28,00"
                """;

        List<ItemBrutoFatura> itens = ParserFaturaNubank.extrair(csv(conteudo));

        assertThat(itens).hasSize(2);
        assertThat(itens.get(0).data()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(itens.get(0).descricao()).isEqualTo("Dl*99 Ride");
        assertThat(itens.get(0).valor()).isEqualByComparingTo("7.56");
    }

    @Test
    void deveInterpretarValorComSeparadorDeMilharENegativoComEspaco() {
        String conteudo = """
                date,title,amount
                2026-07-03,Pagamento recebido,"- 2.095,68"
                2026-07-03,Clinica Dra Carina Mac - Parcela 2/4,"125,00"
                """;

        List<ItemBrutoFatura> itens = ParserFaturaNubank.extrair(csv(conteudo));

        // O parser devolve TODAS as linhas agora (quem separa positivo/
        // negativo é o LeituraFaturaService, ver LeituraFaturaServiceTest) —
        // aqui só confere que o valor negativo com separador de milhar foi
        // interpretado certo.
        assertThat(itens).hasSize(2);
        assertThat(itens.get(0).valor()).isEqualByComparingTo("-2095.68");
        assertThat(itens.get(1).valor()).isEqualByComparingTo("125.00");
    }

    @Test
    void naoDeveFiltrarLinhasComValorNegativo() {
        String conteudo = """
                date,title,amount
                2026-07-08,iFood - NuPay,"- 9,90"
                2026-07-11,"Estorno de ""Dl*99 Ride"" (99)","- 3,00"
                2026-07-07,iFood - NuPay,"8,69"
                """;

        List<ItemBrutoFatura> itens = ParserFaturaNubank.extrair(csv(conteudo));

        assertThat(itens).hasSize(3);
    }

    @Test
    void deveInterpretarAspasEscapadasNaDescricao() {
        String conteudo = """
                date,title,amount
                2026-07-20,"IOF de ""Anthropic* Claude Sub""\","4,00"
                """;

        List<ItemBrutoFatura> itens = ParserFaturaNubank.extrair(csv(conteudo));

        assertThat(itens).hasSize(1);
        assertThat(itens.get(0).descricao()).isEqualTo("IOF de \"Anthropic* Claude Sub\"");
    }

    @Test
    void deveFalharComColunasInesperadas() {
        String conteudo = """
                data,descricao,valor
                2026-07-20,Mercado,"10,00"
                """;

        assertThatThrownBy(() -> ParserFaturaNubank.extrair(csv(conteudo)))
                .isInstanceOf(FaturaInvalidaException.class);
    }

    @Test
    void deveFalharComDataInvalida() {
        String conteudo = """
                date,title,amount
                20-07-2026,Mercado,"10,00"
                """;

        assertThatThrownBy(() -> ParserFaturaNubank.extrair(csv(conteudo)))
                .isInstanceOf(FaturaInvalidaException.class);
    }

    @Test
    void deveDevolverListaVaziaSemLinhasDeDados() {
        String conteudo = "date,title,amount\n";

        List<ItemBrutoFatura> itens = ParserFaturaNubank.extrair(csv(conteudo));

        assertThat(itens).isEmpty();
    }

}
