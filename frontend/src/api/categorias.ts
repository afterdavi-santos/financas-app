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

// DELETE /api/categorias/{id} -> 204 (sem corpo).
export async function excluirCategoria(id: number): Promise<void> {
  await api.delete(`/categorias/${id}`);
}
