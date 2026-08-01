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

// Dois tons de verde (mesma paleta de referência de `utils/cores.ts` /
// `corEscalaEconomia`, não tons genéricos do Tailwind) — renda é sempre
// "positiva", então usa a cor de sinalização positiva do app em vez dos
// azuis do brandbook.
const COR_FIXA = "#005E2F"; // verde escuro — metade de baixo da coluna
const COR_VARIAVEL = "#568E3F"; // verde claro — metade de cima da coluna

export interface PontoRenda {
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

// Gráfico de barras empilhadas da renda mês a mês: cada coluna é dividida em
// Renda fixa (metade de baixo) + Renda variável (metade de cima). Passar o
// mouse sobre qualquer uma das duas partes mostra o valor daquela parte (e da
// outra) no tooltip padrão do Recharts.
export function GraficoRendaMensal({ dados }: { dados: PontoRenda[] }) {
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
          <Bar dataKey="Fixa" name="Renda fixa" stackId="renda" fill={COR_FIXA} radius={[0, 0, 4, 4]} />
          <Bar dataKey="Variavel" name="Renda variável" stackId="renda" fill={COR_VARIAVEL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
