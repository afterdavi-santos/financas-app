import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarCategoria, atualizarCategoria } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import type { Categoria } from "../types/financas";

// Modal com o form de categoria (só o campo `nome`).
// `categoria` (opcional) coloca o modal em modo EDIÇÃO — prefill + PUT em vez de POST.
// `onCriada` avisa a página para fechar o modal e recarregar os dados.
interface Props {
  aberto: boolean;
  onClose: () => void;
  onCriada: () => void;
  categoria?: Categoria | null;
}

export function NovaCategoriaModal({ aberto, onClose, onCriada, categoria }: Props) {
  const editando = !!categoria;
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Ao abrir, sincroniza o campo: com categoria -> prefill; sem -> limpa.
  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setNome(categoria?.nome ?? "");
  }, [aberto, categoria]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      if (editando) {
        await atualizarCategoria(categoria.id, { nome });
      } else {
        await criarCategoria({ nome });
        setNome(""); // limpa para o próximo uso
      }
      onCriada();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal
      titulo={editando ? "Editar categoria" : "Nova categoria"}
      aberto={aberto}
      onClose={onClose}
    >
      <form onSubmit={aoEnviar} className="space-y-4">
        {erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="nome" className="text-sm font-medium text-slate-700">
            Nome
          </label>
          <input
            id="nome"
            type="text"
            required
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Alimentação"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carregando}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {carregando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
