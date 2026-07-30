import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovaCategoriaModal } from "../components/NovaCategoriaModal";
import { ExcluirCategoriaModal } from "../components/ExcluirCategoriaModal";
import { ExcluirCategoriasSelecionadasModal } from "../components/ExcluirCategoriasSelecionadasModal";
import { BarraSelecao } from "../components/BarraSelecao";
import { SelecionarTodos } from "../components/SelecionarTodos";
import { useSelecao } from "../hooks/useSelecao";
import { listarCategorias } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import type { Categoria } from "../types/financas";

export function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Categoria em edição (null com modal aberto = criação de uma nova).
  const [editando, setEditando] = useState<Categoria | null>(null);
  // Categoria selecionada para excluir (abre o popup de exclusão individual).
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null);
  // Popup de exclusão em lote aberto?
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

  function pedirExclusao(cat: Categoria) {
    setCategoriaParaExcluir(cat);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader titulo="Categorias">
        <button
          onClick={abrirNova}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Adicionar categoria
        </button>
      </PageHeader>

      <BarraSelecao
        quantidade={selecionados.size}
        texto={`${selecionados.size} categoria${selecionados.size > 1 ? "s" : ""} selecionada${selecionados.size > 1 ? "s" : ""}`}
        onExcluir={() => setModalLoteAberto(true)}
        onCancelar={limpar}
      />

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          {categorias.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma categoria criada ainda.
            </p>
          ) : (
            <>
              <div className="mb-3">
                <SelecionarTodos
                  marcado={todosSelecionados(categorias.map((c) => c.id))}
                  onAlternar={() =>
                    todosSelecionados(categorias.map((c) => c.id))
                      ? limpar()
                      : selecionarTodos(categorias.map((c) => c.id))
                  }
                />
              </div>
              <ul className="divide-y divide-slate-100">
              {categorias.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between py-3"
                >
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selecionados.has(cat.id)}
                      onChange={() => alternar(cat.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-800">{cat.nome}</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => abrirEdicao(cat)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => pedirExclusao(cat)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
              </ul>
            </>
          )}
        </section>
      )}

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
    </div>
  );
}
