import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovoObjetivoModal } from "../components/NovoObjetivoModal";
import { AportarModal } from "../components/AportarModal";
import { LinhaTempoAportesModal } from "../components/LinhaTempoAportesModal";
import { listarObjetivos, excluirObjetivo } from "../api/objetivos";
import { listarRendas } from "../api/rendas";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { dataBR } from "../utils/rotulos";
import { primeiroDiaDoMesISO } from "../utils/datas";
import { planoObjetivo } from "../utils/objetivos";
import type { Objetivo, Renda } from "../types/financas";

export function ObjetivosPage() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Objetivo em edição (null com modal aberto = criação de um novo).
  const [editando, setEditando] = useState<Objetivo | null>(null);
  // Objetivo selecionado para aportar (null = modal de aporte fechado).
  const [aportando, setAportando] = useState<Objetivo | null>(null);
  // Objetivo cuja linha do tempo de aportes está aberta (null = fechada).
  const [linhaTempo, setLinhaTempo] = useState<Objetivo | null>(null);

  function abrirNovo() {
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(obj: Objetivo) {
    setEditando(obj);
    setModalAberto(true);
  }

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const [objs, rends] = await Promise.all([
        listarObjetivos(),
        listarRendas(),
      ]);
      setObjetivos(objs);
      setRendas(rends);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  // Renda FIXA do mês atual = base do cálculo "% da renda por mês".
  const rendaFixaMensal = useMemo(() => {
    const mesAtual = primeiroDiaDoMesISO(); // "YYYY-MM-01"
    return rendas
      .filter((r) => r.tipo === "FIXA" && r.mesReferencia === mesAtual)
      .reduce((acc, r) => acc + r.valor, 0);
  }, [rendas]);

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
          onClick={abrirNovo}
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
            const plano = planoObjetivo(obj, rendaFixaMensal);
            return (
              <div key={obj.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {obj.descricao}
                    </p>
                    {obj.incentivo && (
                      <p className="mt-0.5 text-xs italic text-indigo-600">
                        “{obj.incentivo}”
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">
                      Meta: {dataBR(obj.dataAlvo)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => abrirEdicao(obj)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluir(obj)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {/* Termômetro: barra com degradê vermelho -> verde. O degradê
                    cobre a largura toda; a "tampa" cinza à direita esconde a
                    parte ainda não atingida, revelando só até o progresso. */}
                <div className="mt-4">
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to right, #ef4444, #f59e0b, #22c55e)",
                      }}
                    />
                    <div
                      className="absolute inset-y-0 right-0 bg-slate-100"
                      style={{ width: `${100 - plano.progresso}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatarBRL(obj.valorAtual)} de {formatarBRL(obj.valorAlvo)}{" "}
                    <span className="text-slate-400">
                      ({plano.progresso.toFixed(0)}%)
                    </span>
                  </p>
                </div>

                {/* Como chegar à meta: aporte mensal necessário e % da renda fixa. */}
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-700">Como chegar à meta</p>
                  {plano.concluido ? (
                    <p className="mt-1 text-green-700">🎉 Meta atingida!</p>
                  ) : plano.percentualRenda === null ? (
                    <p className="mt-1 text-slate-500">
                      Cadastre sua renda fixa deste mês para ver quanto guardar.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-slate-600">
                        Guarde{" "}
                        <strong className="text-slate-800">
                          {formatarBRL(plano.aporteMensal)}/mês
                        </strong>{" "}
                        pelos próximos{" "}
                        {plano.mesesRestantes === 1
                          ? "1 mês"
                          : `${plano.mesesRestantes} meses`}
                        .
                      </p>
                      <p
                        className={`mt-1 font-semibold ${
                          plano.percentualRenda > 100
                            ? "text-red-600"
                            : "text-slate-800"
                        }`}
                      >
                        {plano.percentualRenda.toFixed(0)}% da sua renda fixa por
                        mês
                      </p>
                      {plano.vencido && (
                        <p className="mt-1 text-xs text-red-600">
                          Prazo já vencido — recalculando para este mês.
                        </p>
                      )}
                      {plano.percentualRenda > 100 && (
                        <p className="mt-1 text-xs text-red-600">
                          Acima de 100% da renda fixa: talvez seja preciso rever a
                          meta ou o prazo.
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setAportando(obj)}
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Aportar
                  </button>
                  <button
                    onClick={() => setLinhaTempo(obj)}
                    className="flex-1 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Linha do tempo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NovoObjetivoModal
        aberto={modalAberto}
        objetivo={editando}
        onClose={() => setModalAberto(false)}
        onCriada={() => {
          setModalAberto(false);
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
      <LinhaTempoAportesModal
        objetivo={linhaTempo}
        onClose={() => setLinhaTempo(null)}
        onAlterado={carregar}
      />
    </div>
  );
}
