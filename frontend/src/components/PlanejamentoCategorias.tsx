import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NovaCategoriaModal } from "./NovaCategoriaModal";
import { ExcluirCategoriaModal } from "./ExcluirCategoriaModal";
import { ExcluirCategoriasSelecionadasModal } from "./ExcluirCategoriasSelecionadasModal";
import { BarraSelecao } from "./BarraSelecao";
import { SelecionarTodos } from "./SelecionarTodos";
import { IconeEditar, IconeExcluir } from "./IconesInvestimento";
import { Tooltip } from "./Tooltip";
import { useSelecao } from "../hooks/useSelecao";
import { listarCategorias } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import { rotuloTipoCategoria } from "../utils/rotulos";
import { aoTeclarAtivar } from "../utils/teclado";
import type { Categoria, TipoCategoria } from "../types/financas";

// Filtro Todas/Fixas/Variáveis — mesmo padrão de "Despesas por categoria"
// em Movimentações (ver DespesasPage.tsx).
type FiltroTipo = "TODAS" | TipoCategoria;
const FILTROS: { chave: FiltroTipo; rotulo: string }[] = [
  { chave: "TODAS", rotulo: "Todas" },
  { chave: "FIXA", rotulo: "Fixas" },
  { chave: "VARIAVEL", rotulo: "Variáveis" },
];

// Bloco "Categorias" da página Planejamento — mesmo conteúdo que antes vivia
// em /categorias, agora encaixado numa coluna do grid de 3 blocos, com
// rolagem interna própria (ver PlanejamentoPage) em vez de rolar a página.
interface Props {
  // Nó onde o botão "+ Nova categoria" é portado, pra aparecer junto com os
  // outros dois blocos na linha do título (ver PlanejamentoPage). Sem ele
  // (uso fora de Planejamento), o botão cai no cabeçalho local do bloco.
  headerSlot?: HTMLDivElement | null;
}

export function PlanejamentoCategorias({ headerSlot }: Props = {}) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null);
  const [modalLoteAberto, setModalLoteAberto] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("TODAS");
  const {
    selecionados,
    alternar,
    limpar,
    selecionarTodos,
    desselecionarTodos,
    todosSelecionados,
  } = useSelecao();

  function abrirNova() {
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(cat: Categoria) {
    setEditando(cat);
    setModalAberto(true);
  }

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      setCategorias(await listarCategorias());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const categoriasFiltradas = categorias.filter(
    (c) => filtroTipo === "TODAS" || c.tipo === filtroTipo,
  );

  const botaoNovo = (
    <button
      onClick={abrirNova}
      className="w-full rounded-md bg-grouper-ink px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-black lg:w-auto"
    >
      + Adicionar categoria
    </button>
  );

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-grouper-sky/20 bg-white shadow-sm">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-grouper-sky/20 p-4">
        <h2 className="font-display text-lg font-semibold text-grouper-ink">
          Categorias
        </h2>
        <div className="flex items-center gap-1">
          {FILTROS.map((f) => (
            <button
              key={f.chave}
              onClick={() => setFiltroTipo(f.chave)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filtroTipo === f.chave
                  ? "bg-grouper-sky/40 text-grouper-ink"
                  : "text-grouper-navy/60 hover:bg-grouper-sky/25 hover:text-grouper-ink"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
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
              texto={`${selecionados.size} categoria${selecionados.size > 1 ? "s" : ""} selecionada${selecionados.size > 1 ? "s" : ""}`}
              onExcluir={() => setModalLoteAberto(true)}
              onCancelar={limpar}
            />
            <SelecionarTodos
              marcado={todosSelecionados(categoriasFiltradas.map((c) => c.id))}
              onAlternar={() =>
                todosSelecionados(categoriasFiltradas.map((c) => c.id))
                  ? limpar()
                  : selecionarTodos(categoriasFiltradas.map((c) => c.id))
              }
            />
          </>
        )}

        {carregando ? (
          <p className="text-sm text-grouper-navy/60">Carregando...</p>
        ) : categoriasFiltradas.length === 0 ? (
          <p className="text-sm text-grouper-navy/60">
            {filtroTipo === "TODAS"
              ? "Nenhuma categoria criada ainda."
              : `Nenhuma categoria ${filtroTipo === "FIXA" ? "fixa" : "variável"} ainda.`}
          </p>
        ) : (
            <ul className="divide-y divide-grouper-navy/25">
              {categoriasFiltradas.map((cat, indice) => {
                const selecionado = selecionados.has(cat.id);
                // No primeiro item não há espaço acima dentro do bloco com
                // rolagem própria — o tooltip abre pra baixo (ver Tooltip.tsx).
                const vertical = indice === 0 ? "baixo" : "cima";
                return (
                  <li key={cat.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => alternar(cat.id)}
                      onKeyDown={aoTeclarAtivar(() => alternar(cat.id))}
                      className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-grouper-mid ${
                        selecionado ? "bg-grouper-sky/30" : "hover:bg-grouper-sky/20"
                      }`}
                    >
                      <span className="text-[15px] text-grouper-ink">
                        {cat.nome}{" "}
                        <span className="text-xs font-medium text-grouper-navy/50">
                          · {rotuloTipoCategoria[cat.tipo]}
                        </span>
                      </span>
                      <div
                        className="flex shrink-0 items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip texto="Editar" posicao="direita" vertical={vertical}>
                          <button
                            onClick={() => abrirEdicao(cat)}
                            aria-label="Editar"
                            className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                          >
                            <IconeEditar className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip texto="Excluir" posicao="direita" vertical={vertical}>
                          <button
                            onClick={() => setCategoriaParaExcluir(cat)}
                            aria-label="Excluir"
                            className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                          >
                            <IconeExcluir className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
        )}
      </div>

      <NovaCategoriaModal
        aberto={modalAberto}
        categoria={editando}
        categorias={categorias}
        onClose={() => setModalAberto(false)}
        onCriada={() => {
          setModalAberto(false);
          carregar();
        }}
      />

      <ExcluirCategoriaModal
        categoria={categoriaParaExcluir}
        onClose={() => setCategoriaParaExcluir(null)}
        onEditar={(cat) => {
          setCategoriaParaExcluir(null);
          abrirEdicao(cat);
        }}
        onExcluida={() => {
          if (categoriaParaExcluir) desselecionarTodos([categoriaParaExcluir.id]);
          setCategoriaParaExcluir(null);
          carregar();
        }}
      />

      <ExcluirCategoriasSelecionadasModal
        ids={Array.from(selecionados)}
        aberto={modalLoteAberto}
        onClose={() => setModalLoteAberto(false)}
        onConcluido={() => {
          setModalLoteAberto(false);
          limpar();
          carregar();
        }}
      />
    </section>
  );
}
