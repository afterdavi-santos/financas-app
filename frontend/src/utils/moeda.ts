// Formata um número como Real brasileiro, ex.: 1234.5 -> "R$ 1.234,50".
// Intl.NumberFormat é a API nativa do navegador para isso (sem biblioteca extra).
const formatador = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarBRL(valor: number): string {
  return formatador.format(valor);
}
