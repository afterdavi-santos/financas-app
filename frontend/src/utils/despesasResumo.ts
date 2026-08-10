// Funções PURAS que derivam os resumos da tela de Despesas a partir das despesas
// já buscadas do backend. Ficam isoladas aqui para a página ficar enxuta e para
// serem fáceis de ler/testar (não dependem de React nem de axios).
import type { Despesa, TipoCategoria } from "../types/financas";

// "Mês que conta pro orçamento" de uma despesa: mesReferencia (setado só
// pelo Leitor de fatura, quando a despesa "pula" pro mês em que a fatura é
// paga) se presente, senão o mês de `data` (despesa manual). Espelha
// DespesaSpecification.comPeriodo (COALESCE) no backend. Formato "YYYY-MM".
export function mesEfetivoDespesa(despesa: Despesa): string {
  return (despesa.mesReferencia ?? despesa.data).slice(0, 7);
}

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

// Categorias que SUBIRAM (deltaRs > 0), da maior alta para a menor. Fora da
// disputa: categorias criadas neste mês (não tinham como ter gasto mês
// passado) e categorias sem NENHUM gasto no mês anterior (comparar com zero
// infla a "alta" artificialmente).
export function altasOrdenadas(
  variacoes: VariacaoCategoria[],
): VariacaoCategoria[] {
  return variacoes
    .filter((v) => v.deltaRs > 0 && !v.criadaNoMesAtual && v.anterior > 0)
    .sort((a, b) => b.deltaRs - a.deltaRs);
}

// Categoria que mais SUBIU, ou null se ninguém subiu.
export function maiorAlta(
  variacoes: VariacaoCategoria[],
): VariacaoCategoria | null {
  return altasOrdenadas(variacoes)[0] ?? null;
}

// Categorias que CAÍRAM (deltaRs < 0), da maior queda para a menor. Só
// concorre quem já teve pelo menos um gasto no mês atual — categoria
// "zerada" só porque o mês mal começou não é uma queda de verdade ainda.
export function baixasOrdenadas(
  variacoes: VariacaoCategoria[],
): VariacaoCategoria[] {
  return variacoes
    .filter((v) => v.deltaRs < 0 && v.atual > 0)
    .sort((a, b) => a.deltaRs - b.deltaRs);
}

// Categoria que mais CAIU, ou null se ninguém caiu.
export function maiorBaixa(
  variacoes: VariacaoCategoria[],
): VariacaoCategoria | null {
  return baixasOrdenadas(variacoes)[0] ?? null;
}
