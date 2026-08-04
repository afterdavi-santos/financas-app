import { api } from "./client";
import type { ResumoMensal } from "../types/financas";

// GET /api/relatorios/comparar-meses?inicio=...&fim=... -> um ResumoMensal por
// mês no intervalo (inclusive). O backend normaliza as datas para o 1º dia.
// Usado pelo gráfico "Economia nos últimos meses" da Home.
export async function compararMeses(
  inicio: string,
  fim: string,
): Promise<ResumoMensal[]> {
  const { data } = await api.get<ResumoMensal[]>("/relatorios/comparar-meses", {
    params: { inicio, fim },
  });
  return data;
}
