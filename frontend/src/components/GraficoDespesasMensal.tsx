import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatarBRL } from "../utils/moeda";

// Dois tons de vermelho (mesma paleta de referência de `utils/cores.ts` /
// `corEscalaEconomia`, não tons genéricos do Tailwind) — mesma lógica do
// gráfico de renda (dois tons de verde), só que na cor de sinalização
// negativa, já que despesa não tem "lado positivo".
const COR_FIXA = "#BA0000"; // vermelho escuro — metade de baixo da coluna
const COR_VARIAVEL = "#D96000"; // vermelho/laranja claro — metade de cima da coluna

export interface PontoDespesa {
  rotulo: string;
  Fixa: number;
  Variavel: number;
}

// Eixo Y por extenso (sem abreviar em "mil"), ex.: 1500 -> "R$ 1.500".
function formatarEixoY(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function formatarTooltip(
  value: number | string | ReadonlyArray<number | string> | undefined,
): string {
  return formatarBRL(Number(value));
}

// Gráfico de barras empilhadas das despesas mês a mês: cada coluna é
// dividida em Despesas fixas (metade de baixo) + Despesas variáveis (metade
// de cima) — mesmo formato empilhado do GraficoRendaMensal. Passar o mouse
// sobre qualquer uma das duas partes mostra os dois valores no tooltip
// padrão do Recharts.
export function GraficoDespesasMensal({ dados }: { dados: PontoDespesa[] }) {
  if (dados.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-grouper-navy/60">
        Sem histórico suficiente ainda.
      </p>
    );
  }
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF5FB" />
          <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "#1C4562" }} />
          <YAxis
            tickFormatter={formatarEixoY}
            tick={{ fontSize: 11, fill: "#1C4562" }}
            width={68}
          />
          <Tooltip formatter={formatarTooltip} />
          <Bar dataKey="Fixa" name="Despesas fixas" stackId="despesas" fill={COR_FIXA} radius={[0, 0, 4, 4]} />
          <Bar dataKey="Variavel" name="Despesas variáveis" stackId="despesas" fill={COR_VARIAVEL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
