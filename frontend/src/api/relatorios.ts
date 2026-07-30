import { api } from "./client";
import type { ResumoMensal, ResumoAnual } from "../types/financas";

// GET /api/relatorios/comparar-meses?inicio=...&fim=... -> um ResumoMensal por
// mês no intervalo (inclusive). O backend normaliza as datas para o 1º dia.
export async function compararMeses(
  inicio: string,
  fim: string,
): Promise<ResumoMensal[]> {
  const { data } = await api.get<ResumoMensal[]>("/relatorios/comparar-meses", {
    params: { inicio, fim },
  });
  return data;
}

// GET /api/relatorios/comparar-anos?anoInicio=...&anoFim=... -> um ResumoAnual
// por ano no intervalo (inclusive).
export async function compararAnos(
  anoInicio: number,
  anoFim: number,
): Promise<ResumoAnual[]> {
  const { data } = await api.get<ResumoAnual[]>("/relatorios/comparar-anos", {
    params: { anoInicio, anoFim },
  });
  return data;
}
