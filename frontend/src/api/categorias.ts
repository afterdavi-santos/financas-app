import { api } from "./client";
import type { Categoria, CategoriaRequest } from "../types/financas";

// GET /api/categorias -> lista de categorias do usuário logado.
export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<Categoria[]>("/categorias");
  return data;
}

// POST /api/categorias body {nome} -> 201 com a categoria criada.
export async function criarCategoria(
  req: CategoriaRequest,
): Promise<Categoria> {
  const { data } = await api.post<Categoria>("/categorias", req);
  return data;
}

// PUT /api/categorias/{id} body {nome} -> categoria atualizada.
export async function atualizarCategoria(
  id: number,
  req: CategoriaRequest,
): Promise<Categoria> {
  const { data } = await api.put<Categoria>(`/categorias/${id}`, req);
  return data;
}

// DELETE /api/categorias/{id} -> 204 (sem corpo).
// cascata=true também apaga despesas e limites vinculados (backend recusa com
// 409 se cascata=false e a categoria estiver em uso).
export async function excluirCategoria(
  id: number,
  cascata = false,
): Promise<void> {
  await api.delete(`/categorias/${id}`, { params: cascata ? { cascata: true } : undefined });
}
