import { isAxiosError } from "axios";
import { api } from "./client";
import type {
  LimiteCategoria,
  LimiteCategoriaRequest,
  StatusLimite,
} from "../types/financas";

// GET /api/limites-categoria -> todos os limites (fixos) do usuário.
export async function listarLimites(): Promise<LimiteCategoria[]> {
  const { data } = await api.get<LimiteCategoria[]>("/limites-categoria");
  return data;
}

// GET /api/limites-categoria/status?categoriaId=&mesReferencia= -> quanto já
// foi gasto na categoria NO MÊS informado vs. o teto fixo, e se estourou.
export async function statusLimite(
  categoriaId: number,
  mesReferencia: string,
): Promise<StatusLimite> {
  const { data } = await api.get<StatusLimite>("/limites-categoria/status", {
    params: { categoriaId, mesReferencia },
  });
  return data;
}

// Igual ao statusLimite, mas devolve null quando a categoria NÃO tem limite no
// mês (o backend responde 404 nesse caso). Útil para avisos/simulações onde a
// ausência de limite não é um erro, apenas "não há teto a controlar".
export async function statusLimiteOuNulo(
  categoriaId: number,
  mesReferencia: string,
): Promise<StatusLimite | null> {
  try {
    return await statusLimite(categoriaId, mesReferencia);
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

// POST /api/limites-categoria -> 201 com o limite criado.
export async function criarLimite(
  req: LimiteCategoriaRequest,
): Promise<LimiteCategoria> {
  const { data } = await api.post<LimiteCategoria>("/limites-categoria", req);
  return data;
}

// PUT /api/limites-categoria/{id} -> atualiza valor/mês (categoria não muda).
export async function atualizarLimite(
  id: number,
  req: LimiteCategoriaRequest,
): Promise<LimiteCategoria> {
  const { data } = await api.put<LimiteCategoria>(
    `/limites-categoria/${id}`,
    req,
  );
  return data;
}

// DELETE /api/limites-categoria/{id} -> 204 (sem corpo).
export async function excluirLimite(id: number): Promise<void> {
  await api.delete(`/limites-categoria/${id}`);
}
