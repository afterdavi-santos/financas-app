package com.financas.app.service;

import com.financas.app.dto.ItemFaturaExtraidoResponse;
import com.financas.app.dto.ItemIgnoradoResponse;
import com.financas.app.dto.ProcessarFaturaResponse;
import com.financas.app.exception.FaturaInvalidaException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.util.DetectorDuplicidadeFatura;
import com.financas.app.util.DetectorDuplicidadeFatura.NivelDuplicata;
import com.financas.app.util.ParserFaturaNubank;
import com.financas.app.util.ParserFaturaNubank.ItemBrutoFatura;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class LeituraFaturaService {

    private static final long TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024;
    // Content-types que um .csv de verdade chega, na prática. São vários porque
    // quem preenche esse campo é o sistema operacional, não o app: o Windows
    // com Excel instalado manda application/vnd.ms-excel, sem Excel manda
    // text/csv, e octet-stream é o que sobra quando não há mapeamento nenhum.
    //
    // A lista é permissiva de propósito. O content-type vem do cliente e pode
    // ser forjado — isto NÃO é barreira de segurança, e a barreira de verdade
    // continua sendo o parser, que só lê texto e rejeita o que não casa com o
    // formato do Nubank. O que esta checagem entrega é o caso real e chato:
    // mandar o PDF da fatura em vez do CSV (o próprio modal avisa disso), que
    // antes só falhava lá adiante, com mensagem pior.
    private static final List<String> CONTENT_TYPES_ACEITOS = List.of(
            "text/csv",
            "application/csv",
            "text/plain",
            "application/vnd.ms-excel",
            "application/octet-stream");
    // Candidatas a duplicata/sugestão de categoria são buscadas com folga
    // antes E depois do intervalo de datas da fatura (simétrica), pra cobrir
    // o nível MEDIA (mesma rede/assinatura em datas bem diferentes) e pra não
    // deixar de fora um bloco "(Nx)" já salvo com data um pouco além do
    // máximo do lote atual (ex.: reimportar uma fatura mais antiga/parcial).
    private static final long FOLGA_DIAS_CANDIDATAS = 90;
    private static final String PREFIXO_CREDITO = "(Crédito) ";

    private final DespesaService despesaService;

    public LeituraFaturaService(DespesaService despesaService) {
        this.despesaService = despesaService;
    }

    // `mes` = mês em foco no seletor da página que abriu o leitor ("YYYY-MM")
    // — regra de negócio: é o mês em que a fatura está sendo paga/subida, ou
    // seja, o mês que TODAS as despesas importadas vão contar no orçamento
    // (`mesReferencia`, ver Despesa.java), independente da data real de cada
    // compra — uma fatura real naturalmente cruza dois meses de calendário
    // (compras entre um fechamento e outro), então não faz sentido descartar
    // ou reclassificar linhas por data. A data real continua salva e exibida
    // normalmente (`data`), só não decide mais em que mês a despesa conta.
    public ProcessarFaturaResponse processar(Long usuarioId, MultipartFile arquivo, String mes) {
        validarArquivo(arquivo);
        YearMonth mesSelecionado = parseMes(mes);
        LocalDate mesReferencia = mesSelecionado.atDay(1);

        List<ItemBrutoFatura> todos;
        try {
            todos = ParserFaturaNubank.extrair(arquivo.getInputStream());
        } catch (IOException e) {
            throw new FaturaInvalidaException("Não foi possível ler o arquivo enviado.");
        }

        if (todos.isEmpty()) {
            return new ProcessarFaturaResponse(List.of(), List.of());
        }

        // Valor <= 0 no CSV nunca é despesa (estorno, reembolso ou o próprio
        // "Pagamento recebido" da fatura) — separado aqui só pra transparência
        // (aparece na tela como "ignorado", não desaparece silenciosamente).
        List<ItemBrutoFatura> itens = todos.stream().filter(i -> i.valor().signum() > 0).toList();
        List<ItemIgnoradoResponse> ignorados = todos.stream()
                .filter(i -> i.valor().signum() <= 0)
                .map(i -> new ItemIgnoradoResponse(i.data(), i.descricao(), i.valor(),
                        "Estorno, reembolso ou pagamento da fatura"))
                .toList();

        if (itens.isEmpty()) {
            return new ProcessarFaturaResponse(List.of(), ignorados);
        }

        LocalDate dataMaisAntiga = itens.stream().map(ItemBrutoFatura::data).min(Comparator.naturalOrder()).orElseThrow();
        LocalDate dataMaisRecente = itens.stream().map(ItemBrutoFatura::data).max(Comparator.naturalOrder()).orElseThrow();
        List<Despesa> candidatas = despesaService.listarPorDataReal(usuarioId,
                dataMaisAntiga.minusDays(FOLGA_DIAS_CANDIDATAS), dataMaisRecente.plusDays(FOLGA_DIAS_CANDIDATAS));

        List<ItemFaturaExtraidoResponse> respostas = new ArrayList<>();
        long id = 1;
        for (ItemBrutoFatura item : itens) {
            NivelDuplicata nivel = DetectorDuplicidadeFatura.avaliar(item, candidatas);
            Categoria categoriaSugerida = DetectorDuplicidadeFatura.sugerirCategoria(item, candidatas);
            respostas.add(new ItemFaturaExtraidoResponse(
                    id++,
                    item.data(),
                    mesReferencia,
                    PREFIXO_CREDITO + item.descricao(),
                    item.valor(),
                    categoriaSugerida == null ? null : categoriaSugerida.getId(),
                    categoriaSugerida == null ? null : categoriaSugerida.getNome(),
                    nivel == null ? null : nivel.name()));
        }
        return new ProcessarFaturaResponse(respostas, ignorados);
    }

    private YearMonth parseMes(String mes) {
        try {
            return YearMonth.parse(mes);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new FaturaInvalidaException("Mês selecionado inválido.");
        }
    }

    private void validarArquivo(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new FaturaInvalidaException("Selecione o arquivo CSV da fatura.");
        }
        if (arquivo.getSize() > TAMANHO_MAXIMO_BYTES) {
            throw new FaturaInvalidaException("Arquivo excede o tamanho máximo de 2MB.");
        }
        String nome = arquivo.getOriginalFilename();
        boolean extensaoValida = nome != null && nome.toLowerCase(Locale.ROOT).endsWith(".csv");
        if (!extensaoValida) {
            throw new FaturaInvalidaException("Envie um arquivo .csv exportado do Nubank.");
        }
        // Content-type ausente é aceito: nem todo cliente HTTP manda o campo, e
        // exigi-lo quebraria upload legítimo sem impedir ataque nenhum — quem
        // quer forjar manda o valor certo.
        String contentType = arquivo.getContentType();
        if (contentType != null && !CONTENT_TYPES_ACEITOS.contains(tipoBase(contentType))) {
            throw new FaturaInvalidaException(
                    "Envie o CSV da fatura, não outro formato. No app do Nubank, escolha CSV em vez de PDF.");
        }
    }

    // Remove parâmetros como "; charset=UTF-8" e normaliza a caixa: o
    // content-type chega "text/csv; charset=UTF-8" com frequência, e comparar a
    // string inteira rejeitaria um arquivo perfeitamente válido.
    private static String tipoBase(String contentType) {
        int ponto = contentType.indexOf(';');
        String tipo = ponto < 0 ? contentType : contentType.substring(0, ponto);
        return tipo.trim().toLowerCase(Locale.ROOT);
    }

}
