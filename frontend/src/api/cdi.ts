import { api } from "./client";
import type { CdiAtual } from "../types/financas";

// GET /api/cdi/atual -> taxa CDI diária mais recente (Banco Central), com
// aproximação anualizada. Usado para exibir "CDI atual" ao cadastrar um CDB.
export async function cdiAtual(): Promise<CdiAtual> {
  const { data } = await api.get<CdiAtual>("/cdi/atual");
  return data;
}
