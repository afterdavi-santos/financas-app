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

// Primeiro dia do mês N meses atrás, ex.: n=5 em jul/2026 -> "2026-02-01".
// Usado para montar o intervalo dos gráficos (ex.: "últimos 6 meses").
export function primeiroDiaMesesAtrasISO(n: number): string {
  const hoje = new Date();
  return paraISO(new Date(hoje.getFullYear(), hoje.getMonth() - n, 1));
}
