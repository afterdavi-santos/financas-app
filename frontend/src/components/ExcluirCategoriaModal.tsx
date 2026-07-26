import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { Modal } from "./Modal";
import { excluirCategoria } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import type { Categoria } from "../types/financas";

const PALAVRA_CONFIRMACAO = "EXCLUIR";

// Popup único para excluir uma categoria — substitui o confirm() nativo.
// Começa como uma confirmação simples; só escala para o aviso de cascata
// (digitar EXCLUIR) se o backend recusar a exclusão simples com 409, ou seja,
// se a categoria realmente estiver em uso por despesas/limites.
interface Props {
  categoria: Categoria | null;
  onClose: () => void;
  onEditar: (categoria: Categoria) => void;
  onExcluida: () => void;
}

export function ExcluirCategoriaModal({
  categoria,
  onClose,
  onEditar,
  onExcluida,
}: Props) {
  const [emUso, setEmUso] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Ao abrir para uma categoria diferente, volta ao estágio inicial.
  useEffect(() => {
    setEmUso(false);
    setConfirmacao("");
    setErro(null);
  }, [categoria]);

  const confirmado = confirmacao.trim().toUpperCase() === PALAVRA_CONFIRMACAO;

  async function excluirSimples() {
    if (!categoria) return;
    setErro(null);
    setCarregando(true);
    try {
      await excluirCategoria(categoria.id, false);
      onExcluida();
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 409) {
        setEmUso(true); // escala para o aviso de cascata
      } else {
        setErro(mensagemDeErro(e));
      }
    } finally {
      setCarregando(false);
    }
  }

  async function excluirEmCascata() {
    if (!categoria || !confirmado) return;
    setErro(null);
    setCarregando(true);
    try {
      await excluirCategoria(categoria.id, true);
      onExcluida();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal
      titulo={emUso ? "Categoria em uso" : "Excluir categoria"}
      aberto={categoria !== null}
      onClose={onClose}
    >
      <div className="space-y-4">
        {erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        {!emUso ? (
          <>
            <p className="text-sm text-slate-700">
              Excluir a categoria <strong>"{categoria?.nome}"</strong>? Essa
              ação não pode ser desfeita.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={excluirSimples}
                disabled={carregando}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {carregando ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700">
              A categoria <strong>"{categoria?.nome}"</strong> está sendo usada
              em despesas e/ou limites de gastos.
            </p>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Excluir mesmo assim vai apagar{" "}
              <strong>todas as despesas e limites</strong> vinculados a esta
              categoria, e isso também vai afetar seus relatórios e
              comparativos de meses anteriores. Se quiser só renomear, edite a
              categoria em vez de excluí-la.
            </p>

            <div className="space-y-1">
              <label
                htmlFor="confirmacao-excluir"
                className="text-sm font-medium text-slate-700"
              >
                Para continuar, digite <strong>EXCLUIR</strong>
              </label>
              <input
                id="confirmacao-excluir"
                type="text"
                autoFocus
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="EXCLUIR"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => categoria && onEditar(categoria)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Editar categoria
              </button>
              <button
                type="button"
                onClick={excluirEmCascata}
                disabled={!confirmado || carregando}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {carregando ? "Excluindo..." : "Excluir mesmo assim"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
