import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { aportarObjetivo } from "../api/objetivos";
import { mensagemDeErro } from "../api/erros";
import type { Objetivo } from "../types/financas";

// Modal para "aportar" (adicionar dinheiro) num objetivo específico.
// Recebe o objetivo-alvo; quando null, o modal fica fechado.
interface Props {
  objetivo: Objetivo | null;
  onClose: () => void;
  onAportado: () => void;
}

export function AportarModal({ objetivo, onClose, onAportado }: Props) {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!objetivo) return;
    setErro(null);
    setCarregando(true);
    try {
      await aportarObjetivo(objetivo.id, Number(valor));
      setValor("");
      onAportado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal
      titulo={objetivo ? `Aportar em "${objetivo.descricao}"` : "Aportar"}
      aberto={objetivo !== null}
      onClose={onClose}
    >
      <form onSubmit={aoEnviar} className="space-y-4">
        {erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <div className="space-y-1">
          <label
            htmlFor="aporte-valor"
            className="text-sm font-medium text-slate-700"
          >
            Valor do aporte (R$)
          </label>
          <input
            id="aporte-valor"
            type="number"
            step="0.01"
            min="0.01"
            required
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
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
            {carregando ? "Aportando..." : "Aportar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
