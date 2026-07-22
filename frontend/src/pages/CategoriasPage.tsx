import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovaCategoriaModal } from "../components/NovaCategoriaModal";
import { listarCategorias, excluirCategoria } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import type { Categoria } from "../types/financas";

export function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

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

  async function excluir(cat: Categoria) {
    if (!confirm(`Excluir a categoria "${cat.nome}"?`)) return;
    try {
      await excluirCategoria(cat.id);
      carregar();
    } catch (e) {
      // Ex.: categoria com despesas vinculadas -> backend recusa.
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader titulo="Categorias">
        <button
          onClick={() => setModalAberto(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Adicionar categoria
        </button>
      </PageHeader>

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
            <ul className="divide-y divide-slate-100">
              {categorias.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between py-3"
                >
                  <span className="font-medium text-slate-800">{cat.nome}</span>
                  <button
                    onClick={() => excluir(cat)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <NovaCategoriaModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        onCriada={() => {
          setModalAberto(false);
          carregar();
        }}
      />
    </div>
  );
}
