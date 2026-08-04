import { useEffect, useMemo, useState } from "react";
import { NovoObjetivoModal } from "./NovoObjetivoModal";
import { AportarModal } from "./AportarModal";
import { LinhaTempoAportesModal } from "./LinhaTempoAportesModal";
import { VincularInvestimentoModal } from "./VincularInvestimentoModal";
import { BarraSelecao } from "./BarraSelecao";
import { SelecionarTodos } from "./SelecionarTodos";
import { IconeEditar, IconeExcluir } from "./IconesInvestimento";
import { useSelecao } from "../hooks/useSelecao";
import { listarObjetivos, excluirObjetivo } from "../api/objetivos";
import { listarRendas } from "../api/rendas";
import { listarInvestimentosCdb } from "../api/investimentosCdb";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { dataBR } from "../utils/rotulos";
import { primeiroDiaDoMesISO } from "../utils/datas";
import { planoObjetivo } from "../utils/objetivos";
import { corEscalaProgresso } from "../utils/cores";
import type { InvestimentoCdb, Objetivo, Renda } from "../types/financas";

// Bloco "Objetivos" da página Planejamento — mesmo conteúdo que antes vivia
// em /objetivos, condensado em linhas (em vez dos cards grandes) para caber
// numa coluna do grid de 3 blocos, com rolagem interna própria (ver
// PlanejamentoPage) em vez de rolar a página.
export function PlanejamentoObjetivos() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [investimentos, setInvestimentos] = useState<InvestimentoCdb[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Objetivo | null>(null);
  const [aportando, setAportando] = useState<Objetivo | null>(null);
  const [linhaTempo, setLinhaTempo] = useState<Objetivo | null>(null);
  const [vinculando, setVinculando] = useState<Objetivo | null>(null);
  const {
    selecionados,
    alternar,
    limpar,
    selecionarTodos,
    desselecionarTodos,
    todosSelecionados,
  } = useSelecao();

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
      const [objs, rends, invs] = await Promise.all([
        listarObjetivos(),
        listarRendas(),
        listarInvestimentosCdb(),
      ]);
      setObjetivos(objs);
      setRendas(rends);
      setInvestimentos(invs);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const rendaFixaMensal = useMemo(() => {
    const mesAtual = primeiroDiaDoMesISO();
    return rendas
      .filter((r) => r.tipo === "FIXA" && r.mesReferencia === mesAtual)
      .reduce((acc, r) => acc + r.valor, 0);
  }, [rendas]);

  async function excluir(obj: Objetivo) {
    if (!confirm(`Excluir o objetivo "${obj.descricao}"?`)) return;
    try {
      await excluirObjetivo(obj.id);
      desselecionarTodos([obj.id]);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function excluirSelecionados() {
    const ids = Array.from(selecionados);
    const plural = ids.length > 1;
    if (!confirm(`Excluir ${ids.length} objetivo${plural ? "s" : ""} selecionado${plural ? "s" : ""}?`)) return;
    const resultados = await Promise.allSettled(ids.map((id) => excluirObjetivo(id)));
    const falhas = resultados.filter((r) => r.status === "rejected").length;
    if (falhas > 0) {
      setErro(`${falhas} de ${ids.length} objetivo(s) não puderam ser excluídos.`);
    }
    limpar();
    carregar();
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-grouper-sky/20 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-grouper-sky/20 p-4">
        <h2 className="font-display text-lg font-semibold text-grouper-ink">
          Objetivos
        </h2>
        <button
          onClick={abrirNovo}
          className="rounded-md bg-grouper-deep px-3 py-1.5 font-display text-[13px] uppercase tracking-wide text-white hover:bg-grouper-ink"
        >
          + Novo objetivo
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {erro && (
          <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
            {erro}
          </p>
        )}

        {/* Barra de seleção múltipla e "Selecionar todos" só aparecem quando
            pelo menos 1 item está selecionado — mesmo padrão de "Todas as
            despesas do mês". */}
        {selecionados.size > 0 && (
          <>
            <BarraSelecao
              quantidade={selecionados.size}
              texto={`${selecionados.size} objetivo${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""}`}
              onExcluir={excluirSelecionados}
              onCancelar={limpar}
            />
            <SelecionarTodos
              marcado={todosSelecionados(objetivos.map((o) => o.id))}
              onAlternar={() =>
                todosSelecionados(objetivos.map((o) => o.id))
                  ? limpar()
                  : selecionarTodos(objetivos.map((o) => o.id))
              }
            />
          </>
        )}

        {carregando ? (
          <p className="text-sm text-grouper-navy/60">Carregando...</p>
        ) : objetivos.length === 0 ? (
          <p className="text-sm text-grouper-navy/60">
            Nenhum objetivo criado ainda.
          </p>
        ) : (
            <ul className="divide-y divide-grouper-navy/25">
              {objetivos.map((obj) => {
                const plano = planoObjetivo(obj, rendaFixaMensal);
                const selecionado = selecionados.has(obj.id);
                return (
                  <li key={obj.id}>
                    <div
                      onClick={() => alternar(obj.id)}
                      className={`cursor-pointer rounded-md px-2.5 py-2 transition-colors ${
                        selecionado ? "bg-grouper-sky/30" : "hover:bg-grouper-sky/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-[15px] font-medium text-grouper-ink">
                          {obj.descricao}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[15px] font-semibold text-grouper-deep">
                            {plano.progresso.toFixed(0)}%
                          </span>
                          {obj.investimentoCdbId != null && (
                            <span
                              title={`Vinculado a ${obj.investimentoCdbDescricao}`}
                              className="text-sm"
                            >
                              🔗
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-grouper-mist">
                        <div
                          className="h-full rounded-full transition-[width]"
                          style={{
                            width: `${plano.progresso}%`,
                            backgroundColor: corEscalaProgresso(plano.progresso),
                          }}
                        />
                      </div>

                      <div
                        className="mt-1.5 flex flex-nowrap items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-grouper-deep">
                          {formatarBRL(obj.valorAtual)} de {formatarBRL(obj.valorAlvo)}
                          {!plano.concluido && plano.percentualRenda !== null && (
                            <> · guarde {formatarBRL(plano.aporteMensal)}/mês</>
                          )}
                          {plano.concluido && <> · 🎉 meta atingida</>}
                        </p>
                        <p className="shrink-0 text-[13px] font-medium text-grouper-deep">
                          meta de conclusão {dataBR(obj.dataAlvo)}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {obj.investimentoCdbId == null && (
                            <button
                              onClick={() => setAportando(obj)}
                              className="rounded-md border border-grouper-deep/30 bg-white px-2 py-0.5 text-[13px] font-medium text-grouper-deep hover:bg-grouper-mist"
                            >
                              Aportar
                            </button>
                          )}
                          <button
                            onClick={() => setLinhaTempo(obj)}
                            className="rounded-md border border-grouper-deep/30 bg-white px-2 py-0.5 text-[13px] font-medium text-grouper-deep hover:bg-grouper-mist"
                          >
                            Linha do tempo
                          </button>
                          <button
                            onClick={() => setVinculando(obj)}
                            className="rounded-md border border-grouper-deep/30 bg-white px-2 py-0.5 text-[13px] font-medium text-grouper-deep hover:bg-grouper-mist"
                          >
                            {obj.investimentoCdbId != null ? "Vínculo" : "Vincular"}
                          </button>
                          <button
                            onClick={() => abrirEdicao(obj)}
                            aria-label="Editar"
                            title="Editar"
                            className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                          >
                            <IconeEditar className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => excluir(obj)}
                            aria-label="Excluir"
                            title="Excluir"
                            className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                          >
                            <IconeExcluir className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
        )}
      </div>

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
      <VincularInvestimentoModal
        objetivo={vinculando}
        investimentos={investimentos}
        onClose={() => setVinculando(null)}
        onAlterado={() => {
          setVinculando(null);
          carregar();
        }}
      />
    </section>
  );
}
