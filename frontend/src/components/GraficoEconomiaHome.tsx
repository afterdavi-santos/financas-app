import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatarBRL } from "../utils/moeda";

const COR_POSITIVA = "#5399CD"; // grouper-mid
const COR_NEGATIVA = "#102241"; // grouper-ink

export interface PontoEconomia {
  rotulo: string;
  Economia: number;
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

// Gráfico compacto da economia mês a mês, para o card lateral da Home
// ("Cash Flow Velocity" na referência). Só a série Economia, cores da marca.
export function GraficoEconomiaHome({ dados }: { dados: PontoEconomia[] }) {
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
          <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "#102241" }} />
          <YAxis
            tickFormatter={formatarEixoY}
            tick={{ fontSize: 11, fill: "#102241" }}
            width={68}
          />
          <Tooltip
            formatter={formatarTooltip}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: false, y: false }}
            wrapperStyle={{ pointerEvents: "none" }}
          />
          <Bar dataKey="Economia" radius={[4, 4, 0, 0]}>
            {dados.map((d, i) => (
              <Cell key={i} fill={d.Economia >= 0 ? COR_POSITIVA : COR_NEGATIVA} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
