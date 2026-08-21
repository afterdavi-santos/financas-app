import { isAxiosError } from "axios";
import { api } from "./client";
import type {
  LimiteCategoria,
  LimiteCategoriaRequest,
  StatusLimite,
} from "../types/financas";

// GET /api/limites-categoria?mes= -> os limites VIGENTES no mês informado
// (um limite criado depois, ou já encerrado antes, não aparece nele).
export async function listarLimites(mes?: string): Promise<LimiteCategoria[]> {
  const { data } = await api.get<LimiteCategoria[]>("/limites-categoria", {
    params: mes ? { mes } : undefined,
  });
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

// DELETE /api/limites-categoria/{id}?mes= -> 204 (sem corpo).
// Não apaga o histórico: o limite deixa de valer do mês informado em
// diante, e os meses anteriores continuam com ele.
export async function excluirLimite(id: number, mes?: string): Promise<void> {
  await api.delete(`/limites-categoria/${id}`, {
    params: mes ? { mes } : undefined,
  });
}
