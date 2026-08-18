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

// GET /api/rendas?inicio=...&fim=... -> rendas cujo mesReferencia cai no
// intervalo (extremos inclusive, ambos o 1º dia do mês).
//
// Antes não havia filtro nenhum: o backend devolvia o histórico inteiro e cada
// tela filtrava no cliente. Era o MED-007 — a resposta crescia para sempre. Hoje
// o backend recusa com 400 acima de 2000 lançamentos, então toda chamada passa
// a janela que a tela realmente usa.
//
// `fim` também diz até que mês o backend deve materializar as rendas fixas
// recorrentes, para que um mês futuro no seletor já venha com elas.
export async function listarRendas(intervalo?: {
  inicio?: string;
  fim?: string;
}): Promise<Renda[]> {
  const { data } = await api.get<Renda[]>("/rendas", { params: intervalo });
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
