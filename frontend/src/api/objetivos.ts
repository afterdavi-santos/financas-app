import { api } from "./client";
import type { Objetivo, ObjetivoRequest } from "../types/financas";

// GET /api/objetivos -> objetivos do usuário.
export async function listarObjetivos(): Promise<Objetivo[]> {
  const { data } = await api.get<Objetivo[]>("/objetivos");
  return data;
}

// POST /api/objetivos -> 201 com o objetivo criado (valorAtual começa em 0).
export async function criarObjetivo(req: ObjetivoRequest): Promise<Objetivo> {
  const { data } = await api.post<Objetivo>("/objetivos", req);
  return data;
}

// PUT /api/objetivos/{id} -> atualiza descrição/valorAlvo/dataAlvo do objetivo.
export async function atualizarObjetivo(
  id: number,
  req: ObjetivoRequest,
): Promise<Objetivo> {
  const { data } = await api.put<Objetivo>(`/objetivos/${id}`, req);
  return data;
}

// POST /api/objetivos/{id}/aportar body {valor} -> objetivo com valorAtual somado.
export async function aportarObjetivo(
  id: number,
  valor: number,
): Promise<Objetivo> {
  const { data } = await api.post<Objetivo>(`/objetivos/${id}/aportar`, {
    valor,
  });
  return data;
}

// DELETE /api/objetivos/{id} -> 204 (sem corpo).
export async function excluirObjetivo(id: number): Promise<void> {
  await api.delete(`/objetivos/${id}`);
}
