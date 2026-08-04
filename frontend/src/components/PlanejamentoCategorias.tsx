import { useEffect, useState } from "react";
import { NovaCategoriaModal } from "./NovaCategoriaModal";
import { ExcluirCategoriaModal } from "./ExcluirCategoriaModal";
import { ExcluirCategoriasSelecionadasModal } from "./ExcluirCategoriasSelecionadasModal";
import { BarraSelecao } from "./BarraSelecao";
import { SelecionarTodos } from "./SelecionarTodos";
import { IconeEditar, IconeExcluir } from "./IconesInvestimento";
import { useSelecao } from "../hooks/useSelecao";
import { listarCategorias } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import type { Categoria } from "../types/financas";

// Bloco "Categorias" da página Planejamento — mesmo conteúdo que antes vivia
// em /categorias, agora encaixado numa coluna do grid de 3 blocos, com
// rolagem interna própria (ver PlanejamentoPage) em vez de rolar a página.
export function PlanejamentoCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null);
  const [modalLoteAberto, setModalLoteAberto] = useState(false);
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

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-grouper-sky/20 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-grouper-sky/20 p-4">
        <h2 className="font-display text-lg font-semibold text-grouper-ink">
          Categorias
        </h2>
        <button
          onClick={abrirNova}
          className="rounded-md bg-grouper-deep px-3 py-1.5 font-display text-[13px] uppercase tracking-wide text-white hover:bg-grouper-ink"
        >
          + Nova categoria
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
              texto={`${selecionados.size} categoria${selecionados.size > 1 ? "s" : ""} selecionada${selecionados.size > 1 ? "s" : ""}`}
              onExcluir={() => setModalLoteAberto(true)}
              onCancelar={limpar}
            />
            <SelecionarTodos
              marcado={todosSelecionados(categorias.map((c) => c.id))}
              onAlternar={() =>
                todosSelecionados(categorias.map((c) => c.id))
                  ? limpar()
                  : selecionarTodos(categorias.map((c) => c.id))
              }
            />
          </>
        )}

        {carregando ? (
          <p className="text-sm text-grouper-navy/60">Carregando...</p>
        ) : categorias.length === 0 ? (
          <p className="text-sm text-grouper-navy/60">
            Nenhuma categoria criada ainda.
          </p>
        ) : (
            <ul className="divide-y divide-grouper-navy/25">
              {categorias.map((cat) => {
                const selecionado = selecionados.has(cat.id);
                return (
                  <li key={cat.id}>
                    <div
                      onClick={() => alternar(cat.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-2.5 transition-colors ${
                        selecionado ? "bg-grouper-sky/30" : "hover:bg-grouper-sky/20"
                      }`}
                    >
                      <span className="text-[15px] text-grouper-ink">{cat.nome}</span>
                      <div
                        className="flex shrink-0 items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => abrirEdicao(cat)}
                          aria-label="Editar"
                          title="Editar"
                          className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                        >
                          <IconeEditar className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setCategoriaParaExcluir(cat)}
                          aria-label="Excluir"
                          title="Excluir"
                          className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                        >
                          <IconeExcluir className="h-3.5 w-3.5" />
                        </button>
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
