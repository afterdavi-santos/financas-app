import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "../components/PageHeader";
import { compararMeses, compararAnos } from "../api/relatorios";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { mesCurtoBR } from "../utils/rotulos";
import { primeiroDiaDoMesISO, primeiroDiaMesesAtrasISO } from "../utils/datas";

// Um ponto do gráfico já no formato que o Recharts consome (chaves = séries).
interface Ponto {
  rotulo: string;
  Renda: number;
  Despesas: number;
  Economia: number;
}

// Cores das séries (alinhadas ao resto do app).
const COR_RENDA = "#16a34a"; // green-600
const COR_DESPESAS = "#dc2626"; // red-600
const COR_ECONOMIA = "#2563eb"; // blue-600

// Formata os valores do tooltip como Real. O Recharts tipa o valor de forma
// ampla (número, string, array ou undefined), então normalizamos com Number().
function formatarTooltip(
  value: number | string | ReadonlyArray<number | string> | undefined,
): string {
  return formatarBRL(Number(value));
}

// Eixo Y compacto, ex.: 1500 -> "R$ 1,5 mil".
function formatarEixoY(value: number): string {
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(1)} mil`;
  return `R$ ${value}`;
}

// Gráfico reutilizado nos dois cards (mês a mês e ano a ano): duas barras
// (Renda x Despesas) e uma linha por cima (Economia).
function GraficoComparativo({ dados }: { dados: Ponto[] }) {
  if (dados.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Sem dados para o período.
      </p>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis tickFormatter={formatarEixoY} tick={{ fontSize: 12, fill: "#64748b" }} width={70} />
          <Tooltip formatter={formatarTooltip} />
          <Legend />
          <Bar dataKey="Renda" fill={COR_RENDA} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Despesas" fill={COR_DESPESAS} radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="Economia"
            stroke={COR_ECONOMIA}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RelatoriosPage() {
  const [mesesQtd, setMesesQtd] = useState(6);
  const [anosQtd, setAnosQtd] = useState(3);
  const [dadosMeses, setDadosMeses] = useState<Ponto[]>([]);
  const [dadosAnos, setDadosAnos] = useState<Ponto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const inicio = primeiroDiaMesesAtrasISO(mesesQtd - 1);
      const fim = primeiroDiaDoMesISO();
      const anoFim = new Date().getFullYear();
      const anoInicio = anoFim - (anosQtd - 1);

      const [meses, anos] = await Promise.all([
        compararMeses(inicio, fim),
        compararAnos(anoInicio, anoFim),
      ]);

      setDadosMeses(
        meses.map((r) => ({
          rotulo: mesCurtoBR(r.mes),
          Renda: r.totalRenda,
          Despesas: r.totalDespesas,
          Economia: r.economia,
        })),
      );
      setDadosAnos(
        anos.map((r) => ({
          rotulo: String(r.ano),
          Renda: r.totalRenda,
          Despesas: r.totalDespesas,
          Economia: r.economia,
        })),
      );
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesesQtd, anosQtd]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader titulo="Relatórios" />

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <>
          {/* Comparação mês a mês */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-800">
                Mês a mês
              </h2>
              <select
                value={mesesQtd}
                onChange={(e) => setMesesQtd(Number(e.target.value))}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>Últimos 3 meses</option>
                <option value={6}>Últimos 6 meses</option>
                <option value={12}>Últimos 12 meses</option>
              </select>
            </div>
            <GraficoComparativo dados={dadosMeses} />
          </section>

          {/* Comparação ano a ano */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-800">
                Ano a ano
              </h2>
              <select
                value={anosQtd}
                onChange={(e) => setAnosQtd(Number(e.target.value))}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={2}>Últimos 2 anos</option>
                <option value={3}>Últimos 3 anos</option>
                <option value={5}>Últimos 5 anos</option>
              </select>
            </div>
            <GraficoComparativo dados={dadosAnos} />
          </section>
        </>
      )}
    </div>
  );
}
