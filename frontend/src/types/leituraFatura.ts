// Espelha os DTOs do backend do leitor de fatura Nubank
// (com.financas.app.dto.ItemFaturaExtraidoResponse).

// -> DetectorDuplicidadeFatura.NivelDuplicata (null = sem sinal de duplicata).
// BLOCO = corresponde (descrição + mesmo mês) a uma despesa já salva como
// bloco "(Nx)" numa importação anterior — sem conferência de valor exato,
// então tem selo próprio, distinto da escala de risco.
export type NivelDuplicata = "ALTISSIMA" | "ALTA" | "MEDIA" | "BLOCO" | null;

// -> ItemFaturaExtraidoResponse. `id` é sintético (posição na lista da
// resposta) — só serve pra rastrear seleção no frontend, nada persiste até
// o usuário confirmar via POST /despesas/lote. `data`: data real da compra
// (do CSV), sempre preservada. `mesReferencia`: mês selecionado na tela ao
// abrir o leitor — igual para todos os itens, é o mês que vai contar no
// orçamento (a despesa "pula" pra esse mês independente da data real).
export interface ItemFaturaExtraido {
  id: number;
  data: string; // "YYYY-MM-DD"
  mesReferencia: string; // "YYYY-MM-DD" (primeiro dia do mês selecionado)
  descricao: string;
  valor: number;
  categoriaSugeridaId: number | null;
  categoriaSugeridaNome: string | null;
  nivelDuplicata: NivelDuplicata;
}

// -> ItemIgnoradoResponse. Linha da fatura com valor <= 0 (estorno,
// reembolso ou o próprio pagamento da fatura) — nunca é uma despesa
// importável; mostrada só pra o usuário conferir o que foi descartado.
export interface ItemIgnorado {
  data: string; // "YYYY-MM-DD"
  descricao: string;
  valor: number; // negativo ou zero
  motivo: string;
}

// -> ProcessarFaturaResponse
export interface ProcessarFaturaResponse {
  itens: ItemFaturaExtraido[];
  ignorados: ItemIgnorado[];
}
