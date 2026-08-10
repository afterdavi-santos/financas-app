package com.financas.app.util;

import com.financas.app.exception.FaturaInvalidaException;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

// Parser do CSV de fatura exportado pelo app do Nubank (colunas: date, title,
// amount — data em ISO, valor em formato BR entre aspas, ex. "166,83" ou
// "- 2.095,68"). Função pura, sem dependência do Spring, fácil de testar com
// um texto de CSV puro.
public final class ParserFaturaNubank {

    private static final Set<String> COLUNAS_ESPERADAS = Set.of("date", "title", "amount");

    private ParserFaturaNubank() {
    }

    public record ItemBrutoFatura(LocalDate data, String descricao, BigDecimal valor) {
    }

    // Devolve TODAS as linhas, incluindo as de valor negativo (estornos,
    // reembolsos, "Pagamento recebido") — quem decide o que fazer com elas é
    // o chamador (LeituraFaturaService separa em importáveis vs. ignoradas,
    // pra poder mostrar as ignoradas na tela em vez de simplesmente sumir).
    public static List<ItemBrutoFatura> extrair(InputStream csv) {
        List<ItemBrutoFatura> itens = new ArrayList<>();
        try (Reader leitor = new InputStreamReader(csv, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setTrim(true)
                     .build()
                     .parse(leitor)) {

            if (!parser.getHeaderNames().containsAll(COLUNAS_ESPERADAS)) {
                throw new FaturaInvalidaException(
                        "Arquivo não parece ser uma fatura Nubank exportada em CSV (colunas esperadas: date, title, amount).");
            }

            for (CSVRecord registro : parser) {
                BigDecimal valor = interpretarValor(registro.get("amount"));
                LocalDate data = interpretarData(registro.get("date"));
                String descricao = registro.get("title");
                itens.add(new ItemBrutoFatura(data, descricao, valor));
            }
        } catch (IOException e) {
            throw new FaturaInvalidaException("Não foi possível ler o arquivo CSV da fatura.");
        }
        return itens;
    }

    private static LocalDate interpretarData(String bruto) {
        try {
            return LocalDate.parse(bruto.trim());
        } catch (DateTimeParseException e) {
            throw new FaturaInvalidaException("Data inválida na fatura: \"" + bruto + "\".");
        }
    }

    // "166,83" -> 166.83 | "- 2.095,68" -> -2095.68 (sinal separado do
    // número por espaço, "." é separador de milhar, "," é decimal).
    private static BigDecimal interpretarValor(String bruto) {
        String limpo = bruto.replace(" ", "");
        boolean negativo = limpo.startsWith("-");
        if (negativo) {
            limpo = limpo.substring(1);
        }
        limpo = limpo.replace(".", "").replace(",", ".");
        try {
            BigDecimal valor = new BigDecimal(limpo);
            return negativo ? valor.negate() : valor;
        } catch (NumberFormatException e) {
            throw new FaturaInvalidaException("Valor inválido na fatura: \"" + bruto + "\".");
        }
    }

}
