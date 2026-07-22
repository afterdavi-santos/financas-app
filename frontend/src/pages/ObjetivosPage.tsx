import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovoObjetivoModal } from "../components/NovoObjetivoModal";
import { AportarModal } from "../components/AportarModal";
import { listarObjetivos, excluirObjetivo } from "../api/objetivos";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { dataBR } from "../utils/rotulos";
import type { Objetivo } from "../types/financas";

export function ObjetivosPage() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  // Objetivo selecionado para aportar (null = modal de aporte fechado).
  const [aportando, setAportando] = useState<Objetivo | null>(null);

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      setObjetivos(await listarObjetivos());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function excluir(obj: Objetivo) {
    if (!confirm(`Excluir o objetivo "${obj.descricao}"?`)) return;
    try {
      await excluirObjetivo(obj.id);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader titulo="Objetivos">
        <button
          onClick={() => setModalNovo(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Adicionar objetivo
        </button>
      </PageHeader>

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : objetivos.length === 0 ? (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Nenhum objetivo criado ainda.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {objetivos.map((obj) => {
            // Progresso em % (limitado a 100 para a barra não estourar).
            const pct =
              obj.valorAlvo > 0
                ? Math.min(100, (obj.valorAtual / obj.valorAlvo) * 100)
                : 0;
            const concluido = obj.valorAtual >= obj.valorAlvo;
            return (
              <div key={obj.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {obj.descricao}
                    </p>
                    <p className="text-xs text-slate-500">
                      Meta: {dataBR(obj.dataAlvo)}
                    </p>
                  </div>
                  <button
                    onClick={() => excluir(obj)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Excluir
                  </button>
                </div>

                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        concluido ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatarBRL(obj.valorAtual)} de {formatarBRL(obj.valorAlvo)}{" "}
                    <span className="text-slate-400">
                      ({pct.toFixed(0)}%)
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => setAportando(obj)}
                  className="mt-4 w-full rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Aportar
                </button>
              </div>
            );
          })}
        </div>
      )}

      <NovoObjetivoModal
        aberto={modalNovo}
        onClose={() => setModalNovo(false)}
        onCriada={() => {
          setModalNovo(false);
          carregar();
        }}
      />
      <AportarModal
        objetivo={aportando}
        onClose={() => setAportando(null)}
        onAportado={() => {
          setAportando(null);
          carregar();
        }}
      />
    </div>
  );
}
