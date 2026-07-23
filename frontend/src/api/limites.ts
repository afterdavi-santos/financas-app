import { api } from "./client";
import type {
  LimiteCategoria,
  LimiteCategoriaRequest,
  StatusLimite,
} from "../types/financas";

// GET /api/limites-categoria?mesReferencia=YYYY-MM-DD -> limites do mês.
export async function listarLimites(
  mesReferencia: string,
): Promise<LimiteCategoria[]> {
  const { data } = await api.get<LimiteCategoria[]>("/limites-categoria", {
    params: { mesReferencia },
  });
  return data;
}

// GET /api/limites-categoria/status?categoriaId=&mesReferencia= -> quanto já
// foi gasto na categoria no mês vs. o teto, e se estourou.
export async function statusLimite(
  categoriaId: number,
  mesReferencia: string,
): Promise<StatusLimite> {
  const { data } = await api.get<StatusLimite>("/limites-categoria/status", {
    params: { categoriaId, mesReferencia },
  });
  return data;
}

// POST /api/limites-categoria -> 201 com o limite criado.
export async function criarLimite(
  req: LimiteCategoriaRequest,
): Promise<LimiteCategoria> {
  const { data } = await api.post<LimiteCategoria>("/limites-categoria", req);
  return data;
}

// DELETE /api/limites-categoria/{id} -> 204 (sem corpo).
export async function excluirLimite(id: number): Promise<void> {
  await api.delete(`/limites-categoria/${id}`);
}
