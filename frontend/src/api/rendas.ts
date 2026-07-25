import { api } from "./client";
import type { Renda, RendaRequest, Total } from "../types/financas";

// GET /api/rendas/total?mesReferencia=YYYY-MM-DD -> { total } da renda do mês.
// mesReferencia é uma data qualquer dentro do mês (usamos o 1º dia).
export async function totalRenda(mesReferencia: string): Promise<number> {
  const { data } = await api.get<Total>("/rendas/total", {
    params: { mesReferencia },
  });
  return data.total;
}

// GET /api/rendas -> todas as rendas do usuário (sem filtro de mês no backend).
export async function listarRendas(): Promise<Renda[]> {
  const { data } = await api.get<Renda[]>("/rendas");
  return data;
}

// POST /api/rendas -> 201 com a renda criada.
export async function criarRenda(req: RendaRequest): Promise<Renda> {
  const { data } = await api.post<Renda>("/rendas", req);
  return data;
}

// PUT /api/rendas/{id} -> atualiza descrição/valor/mês/tipo da renda.
export async function atualizarRenda(
  id: number,
  req: RendaRequest,
): Promise<Renda> {
  const { data } = await api.put<Renda>(`/rendas/${id}`, req);
  return data;
}

// DELETE /api/rendas/{id} -> 204 (sem corpo).
export async function excluirRenda(id: number): Promise<void> {
  await api.delete(`/rendas/${id}`);
}
