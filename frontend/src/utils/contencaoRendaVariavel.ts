// Função PURA que deriva o "plano de contenção" a partir das despesas
// extraordinárias do mês e do valor que precisa ser cortado para que a renda
// FIXA sozinha (garantida de um mês para o outro) cubra as despesas do mês
// seguinte. Segue o mesmo padrão de utils/despesasResumo.ts e utils/objetivos.ts:
// sem React/axios, fácil de ler/testar.
import type { Despesa } from "../types/financas";
import { totalPorCategoria } from "./despesasResumo";

// Regra de quantas categorias entram no plano: começa só na maior; só chama a
// próxima categoria quando o valor a reduzir é >= 30% da soma já selecionada
// (senão o corte ficaria concentrado demais numa categoria só). Nunca passa de
// MAX_CATEGORIAS — depois disso, se o valor ainda não couber, o corte por
// categoria vai naturalmente se aproximando de 100% (não pode passar disso,
// não dá pra "reduzir mais que o gasto"); se mesmo assim não cobrir, quem
// chama esta função mostra o aviso de valor faltante (`cobreQueda`/`faltante`).
const LIMITE_EXPANSAO = 0.3; // 30% da soma já selecionada
const MAX_CATEGORIAS = 10;

export interface CategoriaReducao {
  nome: string;
  gastoAtual: number;
  reducaoSugerida: number;
  percentualReducao: number; // reducaoSugerida / gastoAtual * 100
}

export interface PlanoContencao {
  valorNecessarioReduzir: number;
  categorias: CategoriaReducao[];
  totalReducaoSugerida: number;
  cobreQueda: boolean;
  faltante: number; // 0 quando cobreQueda
}

// `valorNecessarioReduzir` = max(0, despesasTotais - rendaFixaMes), calculado
// pelo chamador. null quando a renda fixa já cobre as despesas do mês (nada a
// conter — a renda variável não era necessária para fechar as contas).
export function planoContencao(
  despesasExtraordinarias: Despesa[],
  valorNecessarioReduzir: number,
): PlanoContencao | null {
  if (valorNecessarioReduzir <= 0) return null;

  const porCategoria = totalPorCategoria(despesasExtraordinarias, "EXTRAORDINARIA");

  // Começa só na maior categoria; vai chamando a próxima enquanto o valor a
  // reduzir for >= 30% do que já foi selecionado (nunca inclui despesas
  // fixas), até no máximo MAX_CATEGORIAS.
  const limiteCategorias = Math.min(MAX_CATEGORIAS, porCategoria.length);
  let qtd = Math.min(1, porCategoria.length);
  while (qtd < limiteCategorias) {
    const somaAtual = porCategoria
      .slice(0, qtd)
      .reduce((s, c) => s + c.total, 0);
    if (valorNecessarioReduzir >= LIMITE_EXPANSAO * somaAtual) {
      qtd++;
    } else {
      break;
    }
  }

  const selecionadas = porCategoria.slice(0, qtd);
  const soma = selecionadas.reduce((s, c) => s + c.total, 0);
  const cobreQueda = soma >= valorNecessarioReduzir;
  const alvoDistribuido = Math.min(soma, valorNecessarioReduzir);

  // Regra escolhida: proporcional LINEAR ao peso do gasto de cada categoria na
  // soma selecionada. (Alternativas descartadas: proporcional só ao excedente
  // sobre a menor categoria da lista; water-filling, que corta primeiro a maior
  // até nivelar com a próxima — ambas dão mais peso a quem já gasta pouco do
  // que o usuário pediu.)
  const categorias: CategoriaReducao[] = selecionadas.map((c) => {
    const reducaoSugerida = soma > 0 ? (c.total / soma) * alvoDistribuido : 0;
    return {
      nome: c.nome,
      gastoAtual: c.total,
      reducaoSugerida,
      percentualReducao: c.total > 0 ? (reducaoSugerida / c.total) * 100 : 0,
    };
  });

  return {
    valorNecessarioReduzir,
    categorias,
    totalReducaoSugerida: categorias.reduce((s, c) => s + c.reducaoSugerida, 0),
    cobreQueda,
    faltante: cobreQueda ? 0 : valorNecessarioReduzir - soma,
  };
}

// Quão difícil será seguir o plano no mês seguinte, de 0 (nada a cortar) a 1
// (cortando 100% das despesas extraordinárias selecionadas e ainda assim
// insuficiente). Como a redução é distribuída linearmente por categoria (ver
// comentário acima), essa razão já é uniforme entre todas elas — não precisa
// de média ponderada.
export function dificuldadeContencao(plano: PlanoContencao | null): number {
  if (!plano) return 0;
  const somaSelecionadas = plano.categorias.reduce((s, c) => s + c.gastoAtual, 0);
  if (somaSelecionadas <= 0) return 0;
  return Math.min(1, plano.totalReducaoSugerida / somaSelecionadas);
}
