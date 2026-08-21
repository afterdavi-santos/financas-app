import type { FormaPagamento, TipoCategoria, TipoRenda } from "../types/financas";

// Rótulos amigáveis para os enums do backend, num só lugar (reuso entre páginas).
export const rotuloTipoCategoria: Record<TipoCategoria, string> = {
  FIXA: "Fixa",
  VARIAVEL: "Variável",
};

export const rotuloTipoRenda: Record<TipoRenda, string> = {
  FIXA: "Fixa",
  FREELA: "Renda variável",
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

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// "2026-07-01" -> "jul/26" (rótulo compacto do eixo X dos gráficos mensais).
export function mesCurtoBR(iso: string): string {
  const [ano, mes] = iso.split("-");
  return `${MESES_CURTOS[Number(mes) - 1]}/${ano.slice(2)}`;
}

// Forma de pagamento da despesa, com a parcela quando houver: "Débito",
// "Crédito", "Crédito 2/3". Cada parcela é uma despesa própria no mês dela
// (ver DespesaService.gerarParcelas), então o "2/3" é o que diz ao usuário
// que aquela linha é pedaço de uma compra maior.
export function rotuloPagamento(despesa: {
  formaPagamento: FormaPagamento;
  parcelaNumero: number;
  parcelasTotal: number;
}): string {
  const forma = despesa.formaPagamento === "CREDITO" ? "Crédito" : "Débito";
  if (despesa.parcelasTotal <= 1) return forma;
  return `${forma} ${despesa.parcelaNumero}/${despesa.parcelasTotal}`;
}
