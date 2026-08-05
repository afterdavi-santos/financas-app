// Funções PURAS que derivam os resumos da tela de Despesas a partir das despesas
// já buscadas do backend. Ficam isoladas aqui para a página ficar enxuta e para
// serem fáceis de ler/testar (não dependem de React nem de axios).
import type { Despesa, TipoCategoria } from "../types/financas";

// Soma o `valor` das despesas de um dado tipo (FIXA ou VARIAVEL — herdado da categoria).
export function somaPorTipo(despesas: Despesa[], tipo: TipoCategoria): number {
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
  tipo?: TipoCategoria,
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

// As `n` maiores categorias (do tipo informado). Top 5 usa VARIAVEL.
export function topCategorias(
  despesas: Despesa[],
  n: number,
  tipo?: TipoCategoria,
): TotalCategoria[] {
  return totalPorCategoria(despesas, tipo).slice(0, n);
}

// Variação de uma categoria entre o mês atual e o anterior.
// deltaPct = null quando não havia gasto no mês anterior (categoria "nova").
// criadaNoMesAtual: true quando a categoria em si nasceu no mês em foco —
// usado pra tirar da disputa de "maior alta" (comparar contra uma categoria
// que sequer existia mês passado não é uma alta real).
export interface VariacaoCategoria {
  nome: string;
  atual: number;
  anterior: number;
  deltaRs: number; // atual - anterior
  deltaPct: number | null;
  criadaNoMesAtual: boolean;
}

// Compara gasto por categoria entre dois meses. Considera todas as categorias
// presentes em qualquer um dos dois meses (as ausentes contam como 0).
// `mesReferencia` ("YYYY-MM") é o mês em foco (o "atual" da comparação),
// usado só pra calcular `criadaNoMesAtual`.
export function variacaoCategorias(
  despesasAtual: Despesa[],
  despesasAnterior: Despesa[],
  mesReferencia: string,
): VariacaoCategoria[] {
  const atualPorCat = new Map(
    totalPorCategoria(despesasAtual).map((c) => [c.nome, c.total]),
  );
  const anteriorPorCat = new Map(
    totalPorCategoria(despesasAnterior).map((c) => [c.nome, c.total]),
  );
  const nomes = new Set([...atualPorCat.keys(), ...anteriorPorCat.keys()]);

  // dataCriacao da categoria por nome — qualquer despesa das duas listas
  // serve, já que é a mesma categoria (pode só aparecer numa das duas, ex.:
  // categoria nova sem despesa no mês anterior).
  const dataCriacaoPorCat = new Map<string, string | null>();
  for (const d of [...despesasAtual, ...despesasAnterior]) {
    if (!dataCriacaoPorCat.has(d.categoria.nome)) {
      dataCriacaoPorCat.set(d.categoria.nome, d.categoria.dataCriacao);
    }
  }

  return [...nomes].map((nome) => {
    const atual = atualPorCat.get(nome) ?? 0;
    const anterior = anteriorPorCat.get(nome) ?? 0;
    const deltaRs = atual - anterior;
    const deltaPct = anterior === 0 ? null : (deltaRs / anterior) * 100;
    const dataCriacao = dataCriacaoPorCat.get(nome);
    const criadaNoMesAtual = dataCriacao != null && dataCriacao.slice(0, 7) === mesReferencia;
    return { nome, atual, anterior, deltaRs, deltaPct, criadaNoMesAtual };
  });
}

// Categoria que mais SUBIU (maior deltaRs > 0), ou null se ninguém subiu.
// Fora da disputa: categorias criadas neste mês (não tinham como ter gasto
// mês passado) e categorias sem NENHUM gasto no mês anterior (comparar com
// zero infla a "alta" artificialmente).
export function maiorAlta(
  variacoes: VariacaoCategoria[],
): VariacaoCategoria | null {
  const altas = variacoes.filter(
    (v) => v.deltaRs > 0 && !v.criadaNoMesAtual && v.anterior > 0,
  );
  if (altas.length === 0) return null;
  return altas.reduce((max, v) => (v.deltaRs > max.deltaRs ? v : max));
}

// Categoria que mais CAIU (deltaRs mais negativo), ou null se ninguém caiu.
// Só concorre quem já teve pelo menos um gasto no mês atual — categoria
// "zerada" só porque o mês mal começou não é uma queda de verdade ainda.
export function maiorBaixa(
  variacoes: VariacaoCategoria[],
): VariacaoCategoria | null {
  const baixas = variacoes.filter((v) => v.deltaRs < 0 && v.atual > 0);
  if (baixas.length === 0) return null;
  return baixas.reduce((min, v) => (v.deltaRs < min.deltaRs ? v : min));
}
