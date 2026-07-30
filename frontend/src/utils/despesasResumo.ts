// Funções PURAS que derivam os resumos da tela de Despesas a partir das despesas
// já buscadas do backend. Ficam isoladas aqui para a página ficar enxuta e para
// serem fáceis de ler/testar (não dependem de React nem de axios).
import type { Despesa, TipoDespesa } from "../types/financas";

// Soma o `valor` das despesas de um dado tipo (FIXA ou EXTRAORDINARIA).
export function somaPorTipo(despesas: Despesa[], tipo: TipoDespesa): number {
  return despesas
    .filter((d) => d.tipo === tipo)
    .reduce((acc, d) => acc + d.valor, 0);
}

// Um total por categoria (nome + soma), já ordenado do maior para o menor.
export interface TotalCategoria {
  nome: string;
  total: number;
}

// Agrupa por nome da categoria e soma. `tipo` opcional filtra antes de agrupar.
export function totalPorCategoria(
  despesas: Despesa[],
  tipo?: TipoDespesa,
): TotalCategoria[] {
  const filtradas = tipo ? despesas.filter((d) => d.tipo === tipo) : despesas;
  // Map preserva a soma acumulada por nome de categoria.
  const mapa = new Map<string, number>();
  for (const d of filtradas) {
    mapa.set(d.categoria.nome, (mapa.get(d.categoria.nome) ?? 0) + d.valor);
  }
  return [...mapa.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

// As `n` maiores categorias (do tipo informado). Top 5 usa EXTRAORDINARIA.
export function topCategorias(
  despesas: Despesa[],
  n: number,
  tipo?: TipoDespesa,
): TotalCategoria[] {
  return totalPorCategoria(despesas, tipo).slice(0, n);
}

// Variação de uma categoria entre o mês atual e o anterior.
// deltaPct = null quando não havia gasto no mês anterior (categoria "nova").
export interface VariacaoCategoria {
  nome: string;
  atual: number;
  anterior: number;
  deltaRs: number; // atual - anterior
  deltaPct: number | null;
}

// Compara gasto por categoria entre dois meses. Considera todas as categorias
// presentes em qualquer um dos dois meses (as ausentes contam como 0).
export function variacaoCategorias(
  despesasAtual: Despesa[],
  despesasAnterior: Despesa[],
): VariacaoCategoria[] {
  const atualPorCat = new Map(
    totalPorCategoria(despesasAtual).map((c) => [c.nome, c.total]),
  );
  const anteriorPorCat = new Map(
    totalPorCategoria(despesasAnterior).map((c) => [c.nome, c.total]),
  );
  const nomes = new Set([...atualPorCat.keys(), ...anteriorPorCat.keys()]);

  return [...nomes].map((nome) => {
    const atual = atualPorCat.get(nome) ?? 0;
    const anterior = anteriorPorCat.get(nome) ?? 0;
    const deltaRs = atual - anterior;
    const deltaPct = anterior === 0 ? null : (deltaRs / anterior) * 100;
    return { nome, atual, anterior, deltaRs, deltaPct };
  });
}

// Categoria que mais SUBIU (maior deltaRs > 0), ou null se ninguém subiu.
export function maiorAlta(
  variacoes: VariacaoCategoria[],
): VariacaoCategoria | null {
  const altas = variacoes.filter((v) => v.deltaRs > 0);
  if (altas.length === 0) return null;
  return altas.reduce((max, v) => (v.deltaRs > max.deltaRs ? v : max));
}

// Categoria que mais CAIU (deltaRs mais negativo), ou null se ninguém caiu.
export function maiorBaixa(
  variacoes: VariacaoCategoria[],
): VariacaoCategoria | null {
  const baixas = variacoes.filter((v) => v.deltaRs < 0);
  if (baixas.length === 0) return null;
  return baixas.reduce((min, v) => (v.deltaRs < min.deltaRs ? v : min));
}
