import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NovoLimiteModal } from "./NovoLimiteModal";
import { ConfirmacaoModal } from "./ConfirmacaoModal";
import { BarraSelecao } from "./BarraSelecao";
import { SelecionarTodos } from "./SelecionarTodos";
import { IconeEditar, IconeExcluir } from "./IconesInvestimento";
import { Tooltip } from "./Tooltip";
import { useSelecao } from "../hooks/useSelecao";
import { listarCategorias } from "../api/categorias";
import { listarLimites, statusLimite, excluirLimite } from "../api/limites";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { mesAtualYYYYMM, primeiroDiaDoMes } from "../utils/datas";
import { mesCurtoBR } from "../utils/rotulos";
import { aoTeclarAtivar } from "../utils/teclado";
import type { Categoria, LimiteCategoria, StatusLimite } from "../types/financas";

interface Linha {
  limite: LimiteCategoria;
  status: StatusLimite;
}

// Cor da barra conforme o quanto do teto já foi consumido — âmbar de atenção
// (mesma cor não-brandbook usada em "Ponto de atenção" das Despesas, mantida
// de propósito para diferenciar de alarme real) e vermelho/verde do brandbook.
function corDaBarra(estourado: boolean, proporcao: number): string {
  if (estourado) return "bg-grouper-red";
  if (proporcao >= 0.8) return "bg-amber-500";
  return "bg-grouper-green";
}

// Bloco "Limites" da página Planejamento — mesmo conteúdo que antes vivia em
// /limites, agora encaixado numa coluna do grid de 3 blocos, com rolagem
// interna própria (ver PlanejamentoPage) em vez de rolar a página.
interface Props {
  // Nó onde o botão "+ Novo limite" é portado, pra aparecer junto com os
  // outros dois blocos na linha do título (ver PlanejamentoPage). Sem ele
  // (uso fora de Planejamento), o botão cai no cabeçalho local do bloco.
  headerSlot?: HTMLDivElement | null;
  // Mês em foco ("YYYY-MM"), vindo do seletor da página — é o mês contra o
  // qual o gasto de cada categoria é comparado com o teto. O teto em si é
  // fixo (não tem mês), só o consumo muda.
  mes?: string;
}

export function PlanejamentoLimites({ headerSlot, mes = mesAtualYYYYMM() }: Props = {}) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<LimiteCategoria | null>(null);
  // Popup de confirmação de exclusão (substitui o confirm() nativo). null =
  // fechado; guarda a linha em questão para individual, ou "LOTE" para a
  // exclusão dos selecionados.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<Linha | "LOTE" | null>(null);
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

  function abrirEdicao(limite: LimiteCategoria) {
    setEditando(limite);
    setModalAberto(true);
  }

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const mesReferencia = primeiroDiaDoMes(mes);
      const [cats, limites] = await Promise.all([
        listarCategorias(),
        listarLimites(mesReferencia),
      ]);
      const comStatus = await Promise.all(
        limites.map(async (limite) => ({
          limite,
          status: await statusLimite(limite.categoria.id, mesReferencia),
        })),
      );
      setCategorias(cats);
      setLinhas(comStatus);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  // Recarrega ao trocar o mês no seletor da página — o status de cada limite
  // é sempre relativo a um mês.
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  // Categorias podem ter sido criadas/editadas no bloco "Categorias" (ao
  // lado) depois da carga inicial — sem isso, o select de "+ Novo limite"
  // ficava desatualizado até um F5. Refaz a busca toda vez que o modal abre.
  useEffect(() => {
    if (!modalAberto) return;
    listarCategorias()
      .then(setCategorias)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [modalAberto]);

  // useMemo: sem isso, um novo array a cada render reinicia o efeito de
  // useCategoriasSemelhantes (dentro do NovoLimiteModal) indefinidamente
  // (loop infinito de render).
  const categoriasSemLimite = useMemo(() => {
    const comLimite = new Set(linhas.map((l) => l.limite.categoria.id));
    return categorias.filter((c) => !comLimite.has(c.id));
  }, [categorias, linhas]);

  async function confirmarExclusao() {
    if (confirmandoExclusao === "LOTE") {
      const ids = Array.from(selecionados);
      const resultados = await Promise.allSettled(
        ids.map((id) => excluirLimite(id, primeiroDiaDoMes(mes))),
      );
      const falhas = resultados.filter((r) => r.status === "rejected").length;
      if (falhas > 0) {
        setErro(`${falhas} de ${ids.length} limite(s) não puderam ser excluídos.`);
      }
      limpar();
      carregar();
    } else if (confirmandoExclusao) {
      try {
        await excluirLimite(confirmandoExclusao.limite.id, primeiroDiaDoMes(mes));
        desselecionarTodos([confirmandoExclusao.limite.id]);
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
      className="w-full rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-grouper-deep lg:w-auto"
    >
      + Adicionar limite
    </button>
  );

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-grouper-sky/20 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-grouper-sky/20 p-4">
        <h2 className="font-display text-lg font-semibold text-grouper-ink">
          Limites
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
              texto={`${selecionados.size} limite${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""}`}
              onExcluir={() => setConfirmandoExclusao("LOTE")}
              onCancelar={limpar}
            />
            <SelecionarTodos
              marcado={todosSelecionados(linhas.map((l) => l.limite.id))}
              onAlternar={() =>
                todosSelecionados(linhas.map((l) => l.limite.id))
                  ? limpar()
                  : selecionarTodos(linhas.map((l) => l.limite.id))
              }
            />
          </>
        )}

        {carregando ? (
          <p className="text-sm text-grouper-navy/60">Carregando...</p>
        ) : linhas.length === 0 ? (
          <p className="text-sm text-grouper-navy/60">
            Nenhum limite definido ainda.
          </p>
        ) : (
            <ul
              className={`space-y-1 ${
                linhas.length > 3 ? "max-h-60 overflow-y-auto pr-1" : ""
              }`}
            >
              {linhas.map(({ limite, status }, indice) => {
                const proporcao =
                  status.valorLimite > 0 ? status.valorGasto / status.valorLimite : 0;
                const largura = Math.min(proporcao, 1) * 100;
                const selecionado = selecionados.has(limite.id);
                // No primeiro item não há espaço acima dentro do bloco com
                // rolagem própria — o tooltip abre pra baixo (ver Tooltip.tsx).
                const vertical = indice === 0 ? "baixo" : "cima";
                return (
                  <li key={limite.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => alternar(limite.id)}
                      onKeyDown={aoTeclarAtivar(() => alternar(limite.id))}
                      className={`cursor-pointer rounded-md px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-grouper-mid ${
                        selecionado ? "bg-grouper-sky/30" : "hover:bg-grouper-sky/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] text-grouper-ink">
                          {limite.categoria.nome}
                        </p>
                        <div
                          className="flex shrink-0 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {status.estourado && (
                            <span className="rounded-full bg-grouper-red/10 px-2 py-0.5 text-[13px] font-medium text-grouper-red">
                              Estourou
                            </span>
                          )}
                          <Tooltip texto="Editar" posicao="direita" vertical={vertical}>
                            <button
                              onClick={() => abrirEdicao(limite)}
                              aria-label="Editar"
                              className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                            >
                              <IconeEditar className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
                          <Tooltip texto="Excluir" posicao="direita" vertical={vertical}>
                            <button
                              onClick={() => setConfirmandoExclusao({ limite, status })}
                              aria-label="Excluir"
                              className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                            >
                              <IconeExcluir className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>

                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grouper-mist">
                        <div
                          className={`h-full rounded-full ${corDaBarra(status.estourado, proporcao)}`}
                          style={{ width: `${largura}%` }}
                        />
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[13px] font-medium text-grouper-deep">
                        <span>
                          {formatarBRL(status.valorGasto)} de{" "}
                          {formatarBRL(status.valorLimite)}
                        </span>
                        <span>{Math.round(proporcao * 100)}% do limite</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
        )}
      </div>

      <NovoLimiteModal
        aberto={modalAberto}
        limite={editando}
        onClose={() => setModalAberto(false)}
        onCriado={() => {
          setModalAberto(false);
          carregar();
        }}
        categorias={editando ? categorias : categoriasSemLimite}
        mes={mes}
      />

      <ConfirmacaoModal
        aberto={confirmandoExclusao !== null}
        titulo={confirmandoExclusao === "LOTE" ? "Excluir limites" : "Excluir limite"}
        mensagem={
          confirmandoExclusao === "LOTE"
            ? `Excluir ${selecionados.size} limite${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""} a partir de ${mesCurtoBR(primeiroDiaDoMes(mes))}? Obs: não afetará os meses anteriores.

Deseja continuar?`
            : `O limite de "${confirmandoExclusao?.limite.categoria.nome}" deixará de valer a partir de ${mesCurtoBR(primeiroDiaDoMes(mes))}. Obs: não afetará os meses anteriores.

Deseja continuar?`
        }
        onConfirmar={confirmarExclusao}
        onClose={() => setConfirmandoExclusao(null)}
      />
    </section>
  );
}
