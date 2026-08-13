import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NovoObjetivoModal } from "./NovoObjetivoModal";
import { AportarModal } from "./AportarModal";
import { LinhaTempoAportesModal } from "./LinhaTempoAportesModal";
import { VincularInvestimentoModal } from "./VincularInvestimentoModal";
import { ConfirmacaoModal } from "./ConfirmacaoModal";
import { BarraSelecao } from "./BarraSelecao";
import { SelecionarTodos } from "./SelecionarTodos";
import { IconeEditar, IconeExcluir, IconeInfo } from "./IconesInvestimento";
import { Tooltip } from "./Tooltip";
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
import { aoTeclarAtivar } from "../utils/teclado";
import type { InvestimentoCdb, Objetivo, Renda } from "../types/financas";

// Bloco "Objetivos" da página Planejamento — mesmo conteúdo que antes vivia
// em /objetivos, condensado em linhas (em vez dos cards grandes) para caber
// numa coluna do grid de 3 blocos, com rolagem interna própria (ver
// PlanejamentoPage) em vez de rolar a página.
interface Props {
  // Nó onde o botão "+ Novo objetivo" é portado, pra aparecer junto com os
  // outros dois blocos na linha do título (ver PlanejamentoPage). Sem ele
  // (uso fora de Planejamento), o botão cai no cabeçalho local do bloco.
  headerSlot?: HTMLDivElement | null;
}

export function PlanejamentoObjetivos({ headerSlot }: Props = {}) {
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
  // Popup de confirmação de exclusão (substitui o confirm() nativo). null =
  // fechado; guarda o objetivo em questão para individual, ou "LOTE" para a
  // exclusão dos selecionados.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<Objetivo | "LOTE" | null>(null);
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

  async function confirmarExclusao() {
    if (confirmandoExclusao === "LOTE") {
      const ids = Array.from(selecionados);
      const resultados = await Promise.allSettled(ids.map((id) => excluirObjetivo(id)));
      const falhas = resultados.filter((r) => r.status === "rejected").length;
      if (falhas > 0) {
        setErro(`${falhas} de ${ids.length} objetivo(s) não puderam ser excluídos.`);
      }
      limpar();
      carregar();
    } else if (confirmandoExclusao) {
      try {
        await excluirObjetivo(confirmandoExclusao.id);
        desselecionarTodos([confirmandoExclusao.id]);
        carregar();
      } catch (e) {
        setErro(mensagemDeErro(e));
      }
    }
    setConfirmandoExclusao(null);
  }

  const botaoNovo = (
    <button
      onClick={abrirNovo}
      className="w-full rounded-md bg-grouper-deep px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-grouper-ink lg:w-auto"
    >
      + Adicionar objetivo
    </button>
  );

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-grouper-sky/20 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-grouper-sky/20 p-4">
        <h2 className="font-display text-lg font-semibold text-grouper-ink">
          Objetivos
        </h2>
        {headerSlot ? createPortal(botaoNovo, headerSlot) : botaoNovo}
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
              onExcluir={() => setConfirmandoExclusao("LOTE")}
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
              {objetivos.map((obj, indice) => {
                const plano = planoObjetivo(obj, rendaFixaMensal);
                const selecionado = selecionados.has(obj.id);
                // No primeiro item não há espaço acima dentro do bloco com
                // rolagem própria — o tooltip abre pra baixo (ver Tooltip.tsx).
                const vertical = indice === 0 ? "baixo" : "cima";
                return (
                  <li key={obj.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => alternar(obj.id)}
                      onKeyDown={aoTeclarAtivar(() => alternar(obj.id))}
                      className={`cursor-pointer rounded-md px-2.5 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-grouper-mid ${
                        selecionado ? "bg-grouper-sky/30" : "hover:bg-grouper-sky/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="min-w-0 truncate text-[15px] font-medium text-grouper-ink">
                            {obj.descricao}
                          </p>
                          {obj.incentivo && (
                            <Tooltip texto={obj.incentivo} vertical={vertical}>
                              {/* <button>, não <span>: precisa ser focável pra
                                  o tooltip (Tooltip.tsx usa :focus-within)
                                  funcionar no mobile — lá não existe :hover,
                                  então tocar precisa focar pra revelar o
                                  balão. stopPropagation pra não também
                                  selecionar a linha ao tocar. */}
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 text-grouper-navy/70 hover:text-grouper-navy"
                                aria-label="Incentivo"
                              >
                                <IconeInfo className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[15px] font-semibold text-grouper-deep">
                            {plano.progresso.toFixed(0)}%
                          </span>
                          {obj.investimentoCdbId != null && (
                            <Tooltip
                              texto={`Vinculado a ${obj.investimentoCdbDescricao}`}
                              posicao="direita"
                              vertical={vertical}
                            >
                              <span className="text-sm">🔗</span>
                            </Tooltip>
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

                      {/* No mobile os botões vão pra uma linha própria,
                          abaixo de valor/meta (`flex-col` + `contents` em
                          lg+ pra achatar de volta na mesma linha única de
                          sempre — mesma técnica usada na Home pra reordenar
                          sem duplicar JSX, ver docs/design/a11y-e-responsividade.md
                          seção 2.2). Sem isso os 5 botões em `flex-nowrap`
                          empurravam a linha pra fora da tela, gerando
                          rolagem horizontal numa viewport estreita. */}
                      <div
                        className="mt-1.5 flex flex-col gap-1.5 lg:flex-row lg:flex-nowrap lg:items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-nowrap items-center gap-1.5 lg:contents">
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
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 lg:contents">
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
                          <Tooltip texto="Editar" posicao="direita" vertical={vertical}>
                            <button
                              onClick={() => abrirEdicao(obj)}
                              aria-label="Editar"
                              className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                            >
                              <IconeEditar className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
                          <Tooltip texto="Excluir" posicao="direita" vertical={vertical}>
                            <button
                              onClick={() => setConfirmandoExclusao(obj)}
                              aria-label="Excluir"
                              className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                            >
                              <IconeExcluir className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
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

      <ConfirmacaoModal
        aberto={confirmandoExclusao !== null}
        titulo={confirmandoExclusao === "LOTE" ? "Excluir objetivos" : "Excluir objetivo"}
        mensagem={
          confirmandoExclusao === "LOTE"
            ? `Excluir ${selecionados.size} objetivo${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""}?`
            : `Excluir o objetivo "${confirmandoExclusao?.descricao}"?`
        }
        onConfirmar={confirmarExclusao}
        onClose={() => setConfirmandoExclusao(null)}
      />
    </section>
  );
}
