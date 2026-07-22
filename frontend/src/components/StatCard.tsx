import { formatarBRL } from "../utils/moeda";

// Card de "macro" do mês (Renda, Despesas, Economia). Reutilizado 3x na home.
// `destaque` controla a cor do valor (ex.: economia negativa em vermelho).
interface StatCardProps {
  titulo: string;
  valor: number;
  destaque?: "positivo" | "negativo" | "neutro";
}

export function StatCard({ titulo, valor, destaque = "neutro" }: StatCardProps) {
  const cor =
    destaque === "positivo"
      ? "text-green-600"
      : destaque === "negativo"
        ? "text-red-600"
        : "text-slate-800";

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{formatarBRL(valor)}</p>
    </div>
  );
}
