import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Modal } from "./Modal";
import {
  listarAportes,
  editarAporte,
  removerAporte,
} from "../api/objetivos";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { dataBR } from "../utils/rotulos";
import type { Aporte, Objetivo } from "../types/financas";

// Modal com a LINHA DO TEMPO de aportes de um objetivo: um gráfico do valor
// acumulado ao longo do tempo + a lista de aportes, cada um editável/removível.
// `objetivo` null = fechado. `onAlterado` avisa a página-pai para refazer o
// fetch (o valorAtual do objetivo muda ao editar/remover um aporte).
interface Props {
  objetivo: Objetivo | null;
  onClose: () => void;
  onAlterado: () => void;
}

// "2026-07-24" -> "24/07" (rótulo curto do eixo X).
function dataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function formatarTooltip(
  value: number | string | ReadonlyArray<number | string> | undefined,
): string {
  return formatarBRL(Number(value));
}

export function LinhaTempoAportesModal({ objetivo, onClose, onAlterado }: Props) {
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Edição inline de um aporte (null = nenhum em edição).
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editData, setEditData] = useState("");

  async function carregar(objetivoId: number) {
    setErro(null);
    setCarregando(true);
    try {
      setAportes(await listarAportes(objetivoId));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  // Ao abrir num objetivo, carrega os aportes e zera a edição.
  useEffect(() => {
    if (objetivo) {
      setEditandoId(null);
      carregar(objetivo.id);
    }
  }, [objetivo]);

  // Pontos do gráfico: valor ACUMULADO em ordem cronológica (backend já ordena).
  const pontos = useMemo(() => {
    let acumulado = 0;
    return aportes.map((a) => {
      acumulado += a.valor;
      return { rotulo: dataCurta(a.data), Acumulado: acumulado };
    });
  }, [aportes]);

  function iniciarEdicao(a: Aporte) {
    setEditandoId(a.id);
    setEditValor(String(a.valor));
    setEditData(a.data);
  }

  async function salvarEdicao(aporteId: number) {
    if (!objetivo) return;
    setErro(null);
    try {
      await editarAporte(objetivo.id, aporteId, {
        valor: Number(editValor),
        data: editData,
      });
      setEditandoId(null);
      await carregar(objetivo.id);
      onAlterado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function excluir(aporteId: number) {
    if (!objetivo) return;
    if (!confirm("Remover este aporte?")) return;
    setErro(null);
    try {
      await removerAporte(objetivo.id, aporteId);
      await carregar(objetivo.id);
      onAlterado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <Modal
      titulo={objetivo ? `Aportes — ${objetivo.descricao}` : "Aportes"}
      aberto={objetivo !== null}
      onClose={onClose}
      largura="max-w-2xl"
    >
      {erro && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : aportes.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Nenhum aporte ainda. Use "Aportar" para registrar o primeiro.
        </p>
      ) : (
        <div className="space-y-6">
          {/* Gráfico da evolução (valor acumulado) */}
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={pontos}
                margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis
                  tickFormatter={(v: number) =>
                    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                  }
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  width={48}
                />
                <Tooltip formatter={formatarTooltip} />
                <Line
                  type="monotone"
                  dataKey="Acumulado"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Lista de aportes com editar/remover */}
          <ul className="divide-y divide-slate-100">
            {aportes.map((a) => (
              <li key={a.id} className="py-2">
                {editandoId === a.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={editData}
                      onChange={(e) => setEditData(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editValor}
                      onChange={(e) => setEditValor(e.target.value)}
                      className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => salvarEdicao(a.id)}
                      className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-slate-800">
                        {formatarBRL(a.valor)}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        {dataBR(a.data)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => iniciarEdicao(a)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(a.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
