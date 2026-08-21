package com.financas.app.util;

import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.util.ParserFaturaNubank.ItemBrutoFatura;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

// Compara itens extraídos da fatura contra despesas já lançadas pelo usuário,
// em memória (sem SQL novo) — a lista de candidatas já vem carregada uma vez
// via DespesaService.listar. Três níveis de risco de duplicata (ideia do
// usuário): quanto mais critérios baterem, maior a chance de ser repetida.
public final class DetectorDuplicidadeFatura {

    private DetectorDuplicidadeFatura() {
    }

    public enum NivelDuplicata {
        ALTISSIMA, // data + valor + descrição, todos exatos
        ALTA,      // valor exato + data a até 2 dias de diferença, mesmo mês
        BLOCO,     // corresponde (descrição + mesmo mês) a um bloco "(Nx)" já importado
        MEDIA,     // valor exato + descrição parecida, mesmo mês
    }

    private static final long JANELA_DIAS = 2;
    private static final double LIMIAR_SIMILARIDADE_DUPLICATA = 0.6;
    private static final double LIMIAR_SIMILARIDADE_SUGESTAO = 0.5;

    // Sufixo que o leitor de fatura adiciona ao juntar despesas equivalentes
    // (ver LeitorFaturaModal.tsx, "Uber (3x)") — ignorado na comparação,
    // senão uma despesa já importada em bloco nunca bate como duplicata
    // numa reimportação da mesma fatura (a linha crua vem sem o "(3x)").
    private static final Pattern SUFIXO_QUANTIDADE = Pattern.compile("\\s*\\(\\d+x\\)\\s*$", Pattern.CASE_INSENSITIVE);

    // LEGADO: o leitor de fatura já prefixou "(Crédito) " em toda despesa
    // importada. Não prefixa mais — a forma de pagamento virou coluna
    // (Despesa.formaPagamento), e o nome voltou a ser só o do
    // estabelecimento. Continua sendo removido aqui porque as despesas
    // gravadas ANTES dessa mudança seguem no banco com o prefixo: sem isto,
    // reimportar uma fatura antiga não reconheceria nenhuma delas como
    // duplicata exata (ALTISSIMA) ou de bloco (BLOCO). Só pode sair quando
    // não houver mais despesa prefixada em banco nenhum.
    private static final Pattern PREFIXO_CREDITO = Pattern.compile("^\\s*\\(cr[ée]dito\\)\\s*", Pattern.CASE_INSENSITIVE);

    // Devolve o nível mais forte que bater com QUALQUER despesa candidata, ou
    // null se nenhum critério bateu (sem sinal de duplicata). Toda
    // comparação (exceto a de bloco, que já é por natureza restrita ao mês
    // do bloco) exige mesmo mês calendário entre item e candidata — decisão
    // do usuário: preferiu abrir mão de detectar assinatura recorrente com
    // mesmo valor em meses diferentes a ter falso positivo cruzando meses ao
    // reimportar uma fatura com datas em mais de um mês.
    public static NivelDuplicata avaliar(ItemBrutoFatura item, List<Despesa> candidatas) {
        boolean altissima = false;
        boolean alta = false;
        boolean bloco = false;
        boolean media = false;

        for (Despesa candidata : candidatas) {
            // Candidata em bloco (nasceu de "juntar despesas equivalentes",
            // ver LeitorFaturaModal.tsx): o valor salvo é a SOMA de vários
            // itens, então nunca vai bater com o valor de uma linha crua
            // individual — exigir mesmoValor aqui bloquearia qualquer
            // duplicata dessas para sempre. Compara só por descrição (já sem
            // o sufixo "(Nx)", via normalizar) + mesmo mês calendário (o
            // frontend só junta um bloco "(Nx)" com itens do mesmo mês, ver
            // expandirParaMeses em LeitorFaturaModal.tsx — nunca cruza meses).
            if (ehCandidataEmBloco(candidata.getDescricao())) {
                boolean mesmaDescricao = normalizar(item.descricao()).equals(normalizar(candidata.getDescricao()));
                if (mesmaDescricao && YearMonth.from(item.data()).equals(YearMonth.from(candidata.getData()))) {
                    bloco = true;
                }
                continue;
            }

            if (!mesmoValor(item.valor(), candidata.getValor())) {
                continue;
            }
            if (!YearMonth.from(item.data()).equals(YearMonth.from(candidata.getData()))) {
                continue;
            }
            boolean mesmaDescricaoExata = normalizar(item.descricao()).equals(normalizar(candidata.getDescricao()));
            if (item.data().equals(candidata.getData()) && mesmaDescricaoExata) {
                altissima = true;
            }
            if (Math.abs(ChronoUnit.DAYS.between(item.data(), candidata.getData())) <= JANELA_DIAS) {
                alta = true;
            }
            if (similaridade(item.descricao(), candidata.getDescricao()) >= LIMIAR_SIMILARIDADE_DUPLICATA) {
                media = true;
            }
        }

        if (altissima) return NivelDuplicata.ALTISSIMA;
        if (alta) return NivelDuplicata.ALTA;
        if (bloco) return NivelDuplicata.BLOCO;
        if (media) return NivelDuplicata.MEDIA;
        return null;
    }

    // Sugere a categoria da despesa candidata mais parecida (mesmo critério
    // de similaridade do nível MEDIA), ou null sem correspondência razoável.
    public static Categoria sugerirCategoria(ItemBrutoFatura item, List<Despesa> candidatas) {
        Despesa melhor = null;
        double melhorScore = 0;
        for (Despesa candidata : candidatas) {
            double score = similaridade(item.descricao(), candidata.getDescricao());
            if (score >= LIMIAR_SIMILARIDADE_SUGESTAO && score > melhorScore) {
                melhorScore = score;
                melhor = candidata;
            }
        }
        return melhor == null ? null : melhor.getCategoria();
    }

    private static boolean mesmoValor(BigDecimal a, BigDecimal b) {
        return a.compareTo(b) == 0;
    }

    private static boolean ehCandidataEmBloco(String descricao) {
        return SUFIXO_QUANTIDADE.matcher(descricao).find();
    }

    // minúsculas, sem acento, só letras/números — pra comparação tolerante a
    // maiúsculas/pontuação (ex.: "Dl*99 Ride" vs "dl 99 ride") e ao sufixo de
    // quantidade de itens juntados (ex.: "Uber (3x)" vs "Uber").
    private static String normalizar(String texto) {
        String semSufixo = SUFIXO_QUANTIDADE.matcher(texto).replaceAll("");
        String semPrefixo = PREFIXO_CREDITO.matcher(semSufixo).replaceAll("");
        String semAcento = Normalizer.normalize(semPrefixo, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return semAcento.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    // Similaridade normalizada (0 a 1) via distância de Levenshtein — sem
    // dependência nova, roda 100% em memória sobre a lista já carregada.
    private static double similaridade(String a, String b) {
        String x = normalizar(a);
        String y = normalizar(b);
        if (x.isEmpty() || y.isEmpty()) {
            return 0;
        }
        int distancia = levenshtein(x, y);
        int maiorTamanho = Math.max(x.length(), y.length());
        return 1.0 - ((double) distancia / maiorTamanho);
    }

    private static int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= b.length(); j++) {
            dp[0][j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int custo = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + custo);
            }
        }
        return dp[a.length()][b.length()];
    }

}
