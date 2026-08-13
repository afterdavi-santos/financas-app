import type { Categoria } from "../types/financas";
import type { ItemFaturaExtraido } from "../types/leituraFatura";

// Casa "Cartão de Crédito", "cartao credito", "Crédito - Cartão Nubank" etc.
// (com ou sem acento, em qualquer ordem das duas palavras).
const PADRAO_CARTAO_CREDITO = /(cart[aã]o.*cr[eé]dito|cr[eé]dito.*cart[aã]o)/i;

// Primeira categoria do usuário cujo nome bate com o padrão acima, ou
// undefined se nenhuma existir ainda.
export function encontrarCategoriaCartaoCredito(categorias: Categoria[]): Categoria | undefined {
  return categorias.find((c) => PADRAO_CARTAO_CREDITO.test(c.nome));
}

// "Mês principal" da fatura: o mês calendário ("YYYY-MM") que mais aparece
// entre as datas reais dos itens extraídos (moda). Em empate, fica com o
// mês mais recente entre os empatados (mais perto do vencimento).
export function mesPrincipalDaFatura(itens: ItemFaturaExtraido[]): string | null {
  if (itens.length === 0) return null;
  const contagem = new Map<string, number>();
  for (const item of itens) {
    const mes = item.data.slice(0, 7);
    contagem.set(mes, (contagem.get(mes) ?? 0) + 1);
  }
  let melhor: string | null = null;
  let melhorContagem = -1;
  for (const [mes, qtd] of contagem) {
    if (qtd > melhorContagem || (qtd === melhorContagem && mes > (melhor ?? ""))) {
      melhor = mes;
      melhorContagem = qtd;
    }
  }
  return melhor;
}
