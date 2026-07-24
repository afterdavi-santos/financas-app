import { formatarBRL } from "../utils/moeda";

// Card de "macro" do mês (Renda, Despesas, Economia). Reutilizado na home.
// `destaque` controla a cor do valor (ex.: economia negativa em vermelho).
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
      ? "text-green-600"
      : destaque === "negativo"
        ? "text-red-600"
        : "text-slate-800";

  const conteudo = (
    <>
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{formatarBRL(valor)}</p>
    </>
  );

  // Com onClick vira um botão (acessível, foco por teclado) com feedback de hover.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl bg-white p-5 text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {conteudo}
        <p className="mt-2 text-xs text-blue-600">Ver detalhes →</p>
      </button>
    );
  }

  return <div className="rounded-xl bg-white p-5 shadow-sm">{conteudo}</div>;
}
