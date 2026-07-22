import { api } from "./client";
import type { Total } from "../types/financas";

// GET /api/rendas/total?mesReferencia=YYYY-MM-DD -> { total } da renda do mês.
// mesReferencia é uma data qualquer dentro do mês (usamos o 1º dia).
export async function totalRenda(mesReferencia: string): Promise<number> {
  const { data } = await api.get<Total>("/rendas/total", {
    params: { mesReferencia },
  });
  return data.total;
}
