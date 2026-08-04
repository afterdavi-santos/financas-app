import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { excluirCategoria } from "../api/categorias";

const PALAVRA_CONFIRMACAO = "EXCLUIR";

// Popup para excluir várias categorias de uma vez — substitui o confirm()
// nativo da exclusão em lote. Primeiro tenta excluir todas sem cascata; as que
// estiverem em uso (despesas/limites vinculados) falham com 409 e viram um
// segundo estágio pedindo pra digitar EXCLUIR antes de apagar tudo em cascata.
interface Props {
  ids: number[]; // ids selecionados no momento em que o modal foi aberto
  aberto: boolean;
  onClose: () => void;
  // Chamado ao encerrar (cancelar, sucesso total ou parcial) — a página deve
  // recarregar a lista e limpar a seleção, já que algumas podem ter sido
  // excluídas mesmo se o fluxo não terminou 100%.
  onConcluido: () => void;
}

export function ExcluirCategoriasSelecionadasModal({
  ids,
  aberto,
  onClose,
  onConcluido,
}: Props) {
  // Ids que falharam com 409 (em uso) e ainda não foram excluídos.
  const [emUso, setEmUso] = useState<number[]>([]);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setEmUso([]);
    setConfirmacao("");
    setErro(null);
  }, [aberto]);

  const confirmado = confirmacao.trim().toUpperCase() === PALAVRA_CONFIRMACAO;

  // Se já excluiu algo (mesmo que parcialmente), fechar deve recarregar a
  // página — não dá pra simplesmente "cancelar" e fingir que nada mudou.
  function fechar() {
    if (emUso.length > 0) {
      onConcluido();
    } else {
      onClose();
    }
  }

  async function excluirSimples() {
    setErro(null);
    setCarregando(true);
    const resultados = await Promise.allSettled(
      ids.map((id) => excluirCategoria(id, false)),
    );
    setCarregando(false);
    const falharam = ids.filter((_, i) => resultados[i].status === "rejected");
    if (falharam.length === 0) {
      onConcluido();
      return;
    }
    setEmUso(falharam);
  }

  async function excluirEmCascata() {
    if (!confirmado) return;
    setErro(null);
    setCarregando(true);
    const resultados = await Promise.allSettled(
      emUso.map((id) => excluirCategoria(id, true)),
    );
    setCarregando(false);
    const falharamDeNovo = resultados.filter((r) => r.status === "rejected").length;
    if (falharamDeNovo > 0) {
      setErro(
        `${falharamDeNovo} de ${emUso.length} categoria(s) ainda não puderam ser excluídas.`,
      );
      return;
    }
    onConcluido();
  }

  return (
    <Modal
      titulo={emUso.length > 0 ? "Categorias em uso" : "Excluir categorias selecionadas"}
      aberto={aberto}
      onClose={fechar}
    >
      <div className="space-y-4">
        {erro && (
          <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
            {erro}
          </p>
        )}

        {emUso.length === 0 ? (
          <>
            <p className="text-sm text-grouper-navy">
              Excluir {ids.length} categoria{ids.length > 1 ? "s" : ""}{" "}
              selecionada{ids.length > 1 ? "s" : ""}? Essa ação não pode ser
              desfeita.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={fechar}
                className="rounded-md px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-grouper-navy hover:bg-grouper-mist"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={excluirSimples}
                disabled={carregando}
                className="rounded-md bg-red-600 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-red-700 disabled:opacity-60"
              >
                {carregando ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-grouper-navy">
              {emUso.length} de {ids.length} categoria(s) selecionada(s) estão
              sendo usadas em despesas e/ou limites de gastos
              {emUso.length < ids.length && " (as demais já foram excluídas)"}.
            </p>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Excluir mesmo assim vai apagar{" "}
              <strong>todas as despesas e limites</strong> vinculados a essas
              categorias, e isso também vai afetar seus relatórios e
              comparativos de meses anteriores.
            </p>

            <div className="space-y-1">
              <label
                htmlFor="confirmacao-excluir-lote"
                className="text-sm font-medium text-grouper-navy"
              >
                Para continuar, digite <strong>EXCLUIR</strong>
              </label>
              <input
                id="confirmacao-excluir-lote"
                type="text"
                autoFocus
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="EXCLUIR"
                className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={fechar}
                className="rounded-md px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-grouper-navy hover:bg-grouper-mist"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={excluirEmCascata}
                disabled={!confirmado || carregando}
                className="rounded-md bg-red-600 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
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
