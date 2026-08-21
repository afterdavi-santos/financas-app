import { useEffect, useState } from "react";
import { formatarBRL } from "../utils/moeda";
import { planoObjetivo } from "../utils/objetivos";
import { corEscalaProgresso } from "../utils/cores";
import { dataBR } from "../utils/rotulos";
import { NovoObjetivoModal } from "./NovoObjetivoModal";
import { ConfirmacaoModal } from "./ConfirmacaoModal";
import { BarraSelecao } from "./BarraSelecao";
import { SelecionarTodos } from "./SelecionarTodos";
import { IconeEditar, IconeExcluir, IconeInfo } from "./IconesInvestimento";
import { Tooltip } from "./Tooltip";
import { useSelecao } from "../hooks/useSelecao";
import { excluirObjetivo } from "../api/objetivos";
import { mensagemDeErro } from "../api/erros";
import { aoTeclarAtivar } from "../utils/teclado";
import type { Objetivo } from "../types/financas";

interface ObjetivosResumoHomeProps {
  objetivos: Objetivo[];
  rendaFixaMensal: number;
  // Chamado após criar/editar/excluir um objetivo por aqui, para a Home
  // recarregar a lista (o estado dos objetivos vive na HomePage).
  onObjetivoCriado: () => void;
  onErro: (mensagem: string) => void;
}

// Guarda localmente (só nesta máquina/navegador) quais objetivos o usuário
// fixou para sempre aparecerem no topo da Home — é só uma preferência de
// exibição, não faz sentido virar campo no backend.
const CHAVE_FIXADOS = "financas.objetivosFixadosHome";
const MAX_FIXADOS = 2;

function lerFixados(): Set<number> {
  try {
    const bruto = localStorage.getItem(CHAVE_FIXADOS);
    return new Set(bruto ? (JSON.parse(bruto) as number[]) : []);
  } catch {
    return new Set();
  }
}

function IconeFixar({ preenchido }: { preenchido: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M10 3l1.8 4.2L16 8l-3 3 .7 4.3L10 13.3 6.3 15.3 7 11 4 8l4.2-.8L10 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={preenchido ? "currentColor" : "none"}
      />
    </svg>
  );
}

// Resumo condensado de objetivos para a Home, no lugar do "Strategic
// Objectives" da referência: descrição + barra de progresso por objetivo,
// com seleção/edição/exclusão no mesmo padrão do card de Investimento CDB
// (ver `HomePage.tsx`).
export function ObjetivosResumoHome({
  objetivos,
  rendaFixaMensal,
  onObjetivoCriado,
  onErro,
}: ObjetivosResumoHomeProps) {
  const [fixados, setFixados] = useState<Set<number>>(lerFixados);
  const [modalAberto, setModalAberto] = useState(false);

  // Um objetivo excluído (individualmente ou em lote) precisa sair de
  // `fixados` — sem isso, o id excluído fica preso pra sempre no localStorage
  // contando pro limite de MAX_FIXADOS, e o usuário fica impedido de fixar
  // qualquer outro objetivo mesmo com menos de 2 realmente fixados.
  useEffect(() => {
    setFixados((atual) => {
      const idsValidos = new Set(objetivos.map((o) => o.id));
      const limpo = new Set([...atual].filter((id) => idsValidos.has(id)));
      if (limpo.size === atual.size) return atual;
      localStorage.setItem(CHAVE_FIXADOS, JSON.stringify([...limpo]));
      return limpo;
    });
  }, [objetivos]);
  const [editando, setEditando] = useState<Objetivo | null>(null);
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

  function alternarFixado(id: number) {
    setFixados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        if (proximo.size >= MAX_FIXADOS) return atual; // já tem os 2 permitidos
        proximo.add(id);
      }
      localStorage.setItem(CHAVE_FIXADOS, JSON.stringify([...proximo]));
      return proximo;
    });
  }

  function abrirNovo() {
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(objetivo: Objetivo) {
    setEditando(objetivo);
    setModalAberto(true);
  }

  async function confirmarExclusao() {
    if (confirmandoExclusao === "LOTE") {
      const ids = Array.from(selecionados);
      const resultados = await Promise.allSettled(ids.map((id) => excluirObjetivo(id)));
      const falhas = resultados.filter((r) => r.status === "rejected").length;
      if (falhas > 0) {
        onErro(`${falhas} de ${ids.length} objetivo(s) não puderam ser excluídos.`);
      }
      limpar();
      onObjetivoCriado();
    } else if (confirmandoExclusao) {
      try {
        await excluirObjetivo(confirmandoExclusao.id);
        desselecionarTodos([confirmandoExclusao.id]);
        onObjetivoCriado();
      } catch (e) {
        onErro(mensagemDeErro(e));
      }
    }
    setConfirmandoExclusao(null);
  }

  // Fixados primeiro (mantendo a ordem original entre si e entre os demais).
  const objetivosOrdenados = [...objetivos].sort(
    (a, b) => Number(fixados.has(b.id)) - Number(fixados.has(a.id)),
  );

  return (
    <section className="rounded-lg border border-grouper-sky/20 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-grouper-ink">
          Objetivos
        </h2>
        <button
          onClick={abrirNovo}
          className="rounded-md bg-grouper-deep px-3 py-1.5 font-display text-[13px] text-white hover:bg-grouper-ink"
        >
          + Adicionar objetivo
        </button>
      </div>
      {objetivos.length === 0 ? (
        <p className="text-sm text-grouper-navy/60">
          Nenhum objetivo cadastrado.
        </p>
      ) : (
        <>
          {selecionados.size > 0 && (
            <>
              <BarraSelecao
                quantidade={selecionados.size}
                texto={`${selecionados.size} objetivo${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""}`}
                onExcluir={() => setConfirmandoExclusao("LOTE")}
                onCancelar={limpar}
              />
              <div className="mb-3 mt-3">
                <SelecionarTodos
                  marcado={todosSelecionados(objetivos.map((o) => o.id))}
                  onAlternar={() =>
                    todosSelecionados(objetivos.map((o) => o.id))
                      ? limpar()
                      : selecionarTodos(objetivos.map((o) => o.id))
                  }
                />
              </div>
            </>
          )}
          <ul
            className={`divide-y divide-grouper-sky/45 ${
              objetivos.length > 2 ? "max-h-44 overflow-y-auto pr-1" : ""
            }`}
          >
            {objetivosOrdenados.map((obj, indice) => {
              const plano = planoObjetivo(obj, rendaFixaMensal);
              const fixado = fixados.has(obj.id);
              const selecionado = selecionados.has(obj.id);
              // No primeiro item não há espaço acima dentro da lista com
              // rolagem própria — o tooltip abre pra baixo (ver Tooltip.tsx).
              const vertical = indice === 0 ? "baixo" : "cima";
              return (
                <li key={obj.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => alternar(obj.id)}
                    onKeyDown={aoTeclarAtivar(() => alternar(obj.id))}
                    className={`cursor-pointer rounded-md px-3 py-2.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-grouper-mid ${
                      selecionado
                        ? "bg-grouper-sky/30"
                        : "hover:bg-grouper-sky/20 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="text-grouper-ink">{obj.descricao}</p>
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
                      <div
                        className="flex shrink-0 items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-sm font-semibold text-grouper-deep">
                          {plano.progresso.toFixed(0)}%
                        </span>
                        {(() => {
                          const botao = (
                            <button
                              onClick={() => alternarFixado(obj.id)}
                              aria-label={fixado ? "Desafixar objetivo" : "Fixar objetivo"}
                              className={`transition-colors ${
                                fixado
                                  ? "text-grouper-mid"
                                  : "text-grouper-navy/30 hover:text-grouper-navy/60"
                              }`}
                            >
                              <IconeFixar preenchido={fixado} />
                            </button>
                          );
                          // Só mostra tooltip quando o limite já foi
                          // atingido (explica por que o clique não faz
                          // nada) — nos outros casos (fixar/desafixar
                          // normal) o ícone não tem texto nenhum.
                          if (fixado || fixados.size < MAX_FIXADOS) return botao;
                          return (
                            <Tooltip
                              texto={`Só é possível fixar ${MAX_FIXADOS}`}
                              posicao="direita"
                              vertical={vertical}
                            >
                              {botao}
                            </Tooltip>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-grouper-mist">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{
                          width: `${plano.progresso}%`,
                          backgroundColor: corEscalaProgresso(plano.progresso),
                        }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs font-medium text-grouper-deep">
                      {/* Mesmo rótulo da tela de Planejamento
                          (PlanejamentoObjetivos.tsx): some quando a meta já
                          foi atingida (não há mais o que guardar) e quando
                          não há renda fixa cadastrada. `min-w-0 truncate`
                          porque agora os dois lados desta linha disputam a
                          largura do card, que é estreito. */}
                      <span className="min-w-0 truncate">
                        {formatarBRL(obj.valorAtual)} de {formatarBRL(obj.valorAlvo)}
                        {!plano.concluido && plano.percentualRenda !== null && (
                          <> · guarde {formatarBRL(plano.aporteMensal)}/mês</>
                        )}
                      </span>
                      <div
                        className="flex min-w-0 items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate">meta para {dataBR(obj.dataAlvo)}</span>
                        <Tooltip texto="Editar" posicao="direita" vertical={vertical}>
                          <button
                            onClick={() => abrirEdicao(obj)}
                            aria-label="Editar"
                            className="shrink-0 rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                          >
                            <IconeEditar className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip texto="Excluir" posicao="direita" vertical={vertical}>
                          <button
                            onClick={() => setConfirmandoExclusao(obj)}
                            aria-label="Excluir"
                            className="shrink-0 rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
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
        </>
      )}

      <NovoObjetivoModal
        aberto={modalAberto}
        objetivo={editando}
        onClose={() => {
          setModalAberto(false);
          setEditando(null);
        }}
        onCriada={() => {
          setModalAberto(false);
          setEditando(null);
          onObjetivoCriado();
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
