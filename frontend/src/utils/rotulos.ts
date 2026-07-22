import type { TipoDespesa, TipoRenda } from "../types/financas";

// Rótulos amigáveis para os enums do backend, num só lugar (reuso entre páginas).
export const rotuloTipoDespesa: Record<TipoDespesa, string> = {
  FIXA: "Fixa",
  EXTRAORDINARIA: "Extraordinária",
};

export const rotuloTipoRenda: Record<TipoRenda, string> = {
  FIXA: "Fixa",
  FREELA: "Freela",
  RETORNO_INVESTIMENTOS: "Retorno de investimentos",
};

// "2026-07-21" -> "21/07/2026" (sem criar Date, evitando fuso).
export function dataBR(iso: string): string {
  return iso.split("-").reverse().join("/");
}

// "2026-07-01" -> "07/2026" (para exibir mês de referência de rendas).
export function mesBR(iso: string): string {
  const [ano, mes] = iso.split("-");
  return `${mes}/${ano}`;
}
