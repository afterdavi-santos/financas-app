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

// PUT /api/despesas/{id} -> despesa atualizada.
export async function atualizarDespesa(id: number, req: DespesaRequest): Promise<Despesa> {
  const { data } = await api.put<Despesa>(`/despesas/${id}`, req);
  return data;
}

// DELETE /api/despesas/{id} -> 204 (sem corpo).
export async function excluirDespesa(id: number): Promise<void> {
  await api.delete(`/despesas/${id}`);
}

// POST /api/despesas/lote -> confirma em bloco as despesas do leitor de
// fatura (tudo ou nada: se uma falhar, nenhuma fica salva).
export async function criarDespesasEmLote(despesas: DespesaRequest[]): Promise<Despesa[]> {
  const { data } = await api.post<Despesa[]>("/despesas/lote", { despesas });
  return data;
}
