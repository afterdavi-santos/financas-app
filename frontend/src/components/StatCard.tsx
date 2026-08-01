import { formatarBRL } from "../utils/moeda";

// Card de "macro" do mês (Renda, Despesas, Economia). Reutilizado na home.
// `destaque` controla a cor do valor: mid-blue = positivo, ink = negativo,
// navy = neutro — a paleta do brandbook não tem verde/vermelho, então o
// significado financeiro é dado por peso/profundidade da cor, não pelo matiz.
// `onClick` (opcional) torna o card clicável (vira <button>) — usado na tela
// de Despesas para abrir o detalhamento. Sem onClick, é um card estático igual antes.
interface StatCardProps {
  titulo: string;
  valor: number;
  destaque?: "positivo" | "negativo" | "neutro";
  onClick?: () => void;
}

export function StatCard({
  titulo,
  valor,
  destaque = "neutro",
  onClick,
}: StatCardProps) {
  const cor =
    destaque === "positivo"
      ? "text-grouper-deep"
      : destaque === "negativo"
        ? "text-grouper-ink"
        : "text-grouper-ink";

  const acento =
    destaque === "positivo"
      ? "border-grouper-green"
      : destaque === "negativo"
        ? "border-grouper-red"
        : "border-grouper-sky";

  const conteudo = (
    <>
      <p className="font-display text-sm font-semibold uppercase tracking-wider text-grouper-ink">
        {titulo}
      </p>
      <p className={`mt-2 font-display text-3xl font-bold ${cor}`}>
        {formatarBRL(valor)}
      </p>
    </>
  );

  // Com onClick vira um botão (acessível, foco por teclado) com feedback de hover.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-lg border-l-4 ${acento} bg-white p-5 text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-grouper-mid/50`}
      >
        {conteudo}
        <p className="mt-2 text-xs font-medium text-grouper-mid">Ver detalhes →</p>
      </button>
    );
  }

  return (
    <div className={`rounded-lg border-l-4 ${acento} bg-white p-5 shadow-sm`}>
      {conteudo}
    </div>
  );
}
