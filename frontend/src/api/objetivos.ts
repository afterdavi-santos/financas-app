import { api } from "./client";
import type {
  Aporte,
  AporteRequest,
  Objetivo,
  ObjetivoRequest,
} from "../types/financas";

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

// POST /api/objetivos/{id}/aportar body {valor, data?} -> objetivo com valorAtual somado.
export async function aportarObjetivo(
  id: number,
  req: AporteRequest,
): Promise<Objetivo> {
  const { data } = await api.post<Objetivo>(`/objetivos/${id}/aportar`, req);
  return data;
}

// GET /api/objetivos/{id}/aportes -> aportes em ordem cronológica (linha do tempo).
export async function listarAportes(id: number): Promise<Aporte[]> {
  const { data } = await api.get<Aporte[]>(`/objetivos/${id}/aportes`);
  return data;
}

// PUT /api/objetivos/{id}/aportes/{aporteId} -> edita valor/data de um aporte.
export async function editarAporte(
  objetivoId: number,
  aporteId: number,
  req: AporteRequest,
): Promise<Objetivo> {
  const { data } = await api.put<Objetivo>(
    `/objetivos/${objetivoId}/aportes/${aporteId}`,
    req,
  );
  return data;
}

// DELETE /api/objetivos/{id}/aportes/{aporteId} -> remove um aporte.
export async function removerAporte(
  objetivoId: number,
  aporteId: number,
): Promise<Objetivo> {
  const { data } = await api.delete<Objetivo>(
    `/objetivos/${objetivoId}/aportes/${aporteId}`,
  );
  return data;
}

// DELETE /api/objetivos/{id} -> 204 (sem corpo).
export async function excluirObjetivo(id: number): Promise<void> {
  await api.delete(`/objetivos/${id}`);
}

// PUT /api/objetivos/{id}/investimento-cdb {investimentoCdbId} -> vincula um
// investimento CDB ao objetivo; o valorAtual passa a ser a posição dele.
export async function vincularInvestimento(
  id: number,
  investimentoCdbId: number,
): Promise<Objetivo> {
  const { data } = await api.put<Objetivo>(`/objetivos/${id}/investimento-cdb`, {
    investimentoCdbId,
  });
  return data;
}

// DELETE /api/objetivos/{id}/investimento-cdb -> desvincula; valorAtual volta
// a ser o saldo de aportes manuais.
export async function desvincularInvestimento(id: number): Promise<Objetivo> {
  const { data } = await api.delete<Objetivo>(`/objetivos/${id}/investimento-cdb`);
  return data;
}
