// Cálculo do "plano mensal" de um objetivo: quanto ainda falta, em quantos meses,
// e quanto isso representa por mês da renda fixa. Função PURA (sem React) — o
// resultado é recalculado a cada render, então muda sozinho conforme o usuário
// aporta (valorAtual sobe) ou o tempo passa (menos meses até a meta).
import type { Objetivo } from "../types/financas";

export interface PlanoObjetivo {
  progresso: number; // 0..100 (valorAtual / valorAlvo)
  concluido: boolean; // já atingiu a meta
  valorFaltante: number; // quanto ainda falta guardar
  mesesRestantes: number; // meses até a meta, incluindo o mês atual (>= 1)
  vencido: boolean; // a data-alvo já passou e a meta não foi atingida
  aporteMensal: number; // valorFaltante / mesesRestantes
  // % da renda fixa que o aporte mensal representa. null = sem renda fixa cadastrada.
  percentualRenda: number | null;
}

// Meses da data-alvo até o mês atual, contando o mês corrente como aportável.
// Ex.: hoje jul/2026, alvo dez/2026 -> 6 (jul, ago, set, out, nov, dez).
function mesesAte(dataAlvo: string): number {
  const hoje = new Date();
  const [anoA, mesA] = dataAlvo.split("-").map(Number);
  const diff = (anoA - hoje.getFullYear()) * 12 + (mesA - (hoje.getMonth() + 1));
  return diff + 1; // inclui o mês atual
}

export function planoObjetivo(
  obj: Objetivo,
  rendaFixaMensal: number,
): PlanoObjetivo {
  const progresso =
    obj.valorAlvo > 0
      ? Math.min(100, (obj.valorAtual / obj.valorAlvo) * 100)
      : 0;
  const concluido = obj.valorAtual >= obj.valorAlvo;
  const valorFaltante = Math.max(0, obj.valorAlvo - obj.valorAtual);
  const meses = mesesAte(obj.dataAlvo);
  const vencido = !concluido && meses <= 0;
  const mesesRestantes = Math.max(1, meses); // nunca divide por zero
  const aporteMensal = valorFaltante / mesesRestantes;
  const percentualRenda =
    rendaFixaMensal > 0 ? (aporteMensal / rendaFixaMensal) * 100 : null;

  return {
    progresso,
    concluido,
    valorFaltante,
    mesesRestantes,
    vencido,
    aporteMensal,
    percentualRenda,
  };
}
