import { api } from "./client";
import type { Despesa, DespesaRequest } from "../types/financas";

// GET /api/despesas?inicio=...&fim=... -> despesas no intervalo (o mês, na home).
// Passamos as datas como query params via axios `params`.
export async function listarDespesas(intervalo: {
  inicio: string;
  fim: string;
}): Promise<Despesa[]> {
  const { data } = await api.get<Despesa[]>("/despesas", {
    params: intervalo,
  });
  return data;
}

// POST /api/despesas -> 201 com a despesa criada.
export async function criarDespesa(req: DespesaRequest): Promise<Despesa> {
  const { data } = await api.post<Despesa>("/despesas", req);
  return data;
}

// DELETE /api/despesas/{id} -> 204 (sem corpo).
export async function excluirDespesa(id: number): Promise<void> {
  await api.delete(`/despesas/${id}`);
}
