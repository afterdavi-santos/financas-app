// Normalização usada pelas buscas por nome das listas (despesas e rendas do
// mês): sem acento e sem caixa, pra "agua" achar "Água" e "MERCADO" achar
// "Mercado". A comparação em si é um `includes` — trecho em qualquer posição,
// como um LIKE %texto%.
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}
