// Helpers de data no formato ISO "YYYY-MM-DD" (o que o backend LocalDate espera).
// Trabalhamos com a data LOCAL do navegador para evitar o "pulo" de fuso que o
// toISOString() causa (ele converte para UTC e pode voltar/avançar um dia).

// Formata um Date local como "YYYY-MM-DD" sem passar por UTC.
function paraISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0"); // getMonth() é 0-based
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Hoje, ex.: "2026-07-21".
export function hojeISO(): string {
  return paraISO(new Date());
}

// Primeiro dia do mês atual, ex.: "2026-07-01".
export function primeiroDiaDoMesISO(): string {
  const hoje = new Date();
  return paraISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
}

// Último dia do mês atual, ex.: "2026-07-31".
// Truque: dia 0 do PRÓXIMO mês = último dia do mês atual.
export function ultimoDiaDoMesISO(): string {
  const hoje = new Date();
  return paraISO(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
}

// Primeiro dia do mês SEGUINTE ao atual, ex.: em jul/2026 -> "2026-08-01".
export function primeiroDiaDoProximoMesISO(): string {
  const hoje = new Date();
  return paraISO(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1));
}

// Primeiro dia do mês N meses atrás, ex.: n=5 em jul/2026 -> "2026-02-01".
// Usado para montar o intervalo dos gráficos (ex.: "últimos 6 meses").
export function primeiroDiaMesesAtrasISO(n: number): string {
  const hoje = new Date();
  return paraISO(new Date(hoje.getFullYear(), hoje.getMonth() - n, 1));
}

// --- Helpers que recebem um mês "YYYY-MM" (valor do <input type="month">) ---

// Mês atual no formato do <input type="month">, ex.: "2026-07".
export function mesAtualYYYYMM(): string {
  return hojeISO().slice(0, 7);
}

// "2026-07" -> "2026-07-01" (primeiro dia do mês informado).
export function primeiroDiaDoMes(mes: string): string {
  return `${mes}-01`;
}

// "2026-07" -> "2026-07-31" (último dia; dia 0 do mês seguinte).
export function ultimoDiaDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return paraISO(new Date(ano, m, 0)); // m já é 1-based; new Date usa 0-based, então m = mês seguinte
}

// "2026-07" -> "2026-06" (mês anterior; vira o ano corretamente em janeiro).
export function mesAnteriorYYYYMM(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(ano, m - 2, 1); // m-1 = mês atual (0-based); m-2 = anterior
  return paraISO(d).slice(0, 7);
}

// "2026-07" -> "2026-08" (mês seguinte; vira o ano corretamente em dezembro).
export function mesSeguinteYYYYMM(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(ano, m, 1); // m (1-based, mês atual) vira 0-based do mês seguinte
  return paraISO(d).slice(0, 7);
}

// Primeiro dia do mês N meses ANTES do mês informado (formato "YYYY-MM"),
// ex.: mes="2026-07", n=5 -> "2026-02-01". Igual a `primeiroDiaMesesAtrasISO`,
// mas ancorado num mês escolhido em vez de sempre no mês atual — usado pra
// gráficos que seguem o mês em foco de um filtro (ex.: "últimos 6 meses" a
// partir do mês selecionado em Despesas).
export function primeiroDiaMesesAtrasDoMes(mes: string, n: number): string {
  const [ano, m] = mes.split("-").map(Number);
  return paraISO(new Date(ano, m - 1 - n, 1)); // m-1 = mês (0-based); -n volta n meses
}
