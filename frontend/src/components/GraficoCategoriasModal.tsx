import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Modal } from "./Modal";
import { formatarBRL } from "../utils/moeda";
import type { TotalCategoria } from "../utils/despesasResumo";

interface Props {
  aberto: boolean;
  onClose: () => void;
  titulo: string;
  // Já vem ordenado da maior para a menor (`totalPorCategoria`).
  dados: TotalCategoria[];
}

// Barras HORIZONTAIS (`layout="vertical"` no Recharts — nome contraintuitivo
// da lib, é a orientação das barras que fica vertical... na verdade é o
// eixo de categorias que vira o eixo Y). Cada categoria tem uma altura fixa;
// a partir de 10 categorias, o popup ganha rolagem VERTICAL em vez de
// espremer as barras.
const ALTURA_POR_BARRA = 40;
const LIMITE_SEM_ROLAGEM = 10;
const ALTURA_MINIMA = 200;

function formatarEixoValor(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function formatarTooltip(
  value: number | string | ReadonlyArray<number | string> | undefined,
): string {
  return formatarBRL(Number(value));
}

export function GraficoCategoriasModal({ aberto, onClose, titulo, dados }: Props) {
  const precisaRolagem = dados.length > LIMITE_SEM_ROLAGEM;
  const alturaGrafico = Math.max(dados.length * ALTURA_POR_BARRA, ALTURA_MINIMA);

  return (
    <Modal titulo={titulo} aberto={aberto} onClose={onClose} largura="max-w-2xl">
      {dados.length === 0 ? (
        <p className="py-8 text-center text-sm text-grouper-navy/60">
          Nenhuma despesa neste mês.
        </p>
      ) : (
        <div
          className={precisaRolagem ? "overflow-y-auto pr-1" : ""}
          style={precisaRolagem ? { maxHeight: LIMITE_SEM_ROLAGEM * ALTURA_POR_BARRA } : undefined}
        >
          <div className="w-full" style={{ height: alturaGrafico }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dados}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF5FB" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={formatarEixoValor}
                  tick={{ fontSize: 11, fill: "#102241" }}
                />
                <YAxis
                  dataKey="nome"
                  type="category"
                  tick={{ fontSize: 12, fill: "#102241" }}
                  width={110}
                />
                <Tooltip
                  formatter={formatarTooltip}
                  isAnimationActive={false}
                  allowEscapeViewBox={{ x: false, y: false }}
                  wrapperStyle={{ pointerEvents: "none" }}
                />
                <Bar dataKey="total" name="Despesas" fill="#244C7E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Modal>
  );
}
