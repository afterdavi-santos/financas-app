import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { investirMaisCdb } from "../api/investimentosCdb";
import { mensagemDeErro } from "../api/erros";
import type { InvestimentoCdb } from "../types/financas";

// Modal para aportar mais dinheiro num investimento CDB já existente.
interface Props {
  investimento: InvestimentoCdb | null;
  onClose: () => void;
  onInvestido: () => void;
}

export function InvestirMaisModal({ investimento, onClose, onInvestido }: Props) {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!investimento) return;
    setErro(null);
    setCarregando(true);
    try {
      await investirMaisCdb(investimento.id, Number(valor));
      setValor("");
      onInvestido();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal
      titulo={investimento ? `Investir mais — ${investimento.descricao}` : "Investir mais"}
      aberto={investimento !== null}
      onClose={onClose}
    >
      <form onSubmit={aoEnviar} className="space-y-4">
        {erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <p className="text-xs text-slate-500">
          O valor extra passa a render junto com o saldo atual, a partir de
          hoje.
        </p>

        <div className="space-y-1">
          <label
            htmlFor="investir-mais-valor"
            className="text-sm font-medium text-slate-700"
          >
            Valor adicional (R$)
          </label>
          <input
            id="investir-mais-valor"
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
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {carregando ? "Investindo..." : "Investir"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
