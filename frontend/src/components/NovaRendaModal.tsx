import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarRenda } from "../api/rendas";
import { mensagemDeErro } from "../api/erros";
import { primeiroDiaDoMesISO } from "../utils/datas";
import type { TipoRenda } from "../types/financas";

// Modal do form de nova renda: descricao, valor e mês de referência.
// O <input type="month"> devolve "YYYY-MM"; o backend espera "YYYY-MM-DD",
// então completamos com "-01" (1º dia do mês) ao enviar.
interface Props {
  aberto: boolean;
  onClose: () => void;
  onCriada: () => void;
}

// "2026-07-01" -> "2026-07" (valor que o <input type="month"> entende).
function mesInicial(): string {
  return primeiroDiaDoMesISO().slice(0, 7);
}

export function NovaRendaModal({ aberto, onClose, onCriada }: Props) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [mes, setMes] = useState(mesInicial()); // "YYYY-MM"
  const [tipo, setTipo] = useState<TipoRenda>("FIXA");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await criarRenda({
        descricao,
        valor: Number(valor),
        mesReferencia: `${mes}-01`, // "YYYY-MM" -> "YYYY-MM-01"
        tipo,
      });
      setDescricao("");
      setValor("");
      setMes(mesInicial());
      setTipo("FIXA");
      onCriada();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal titulo="Nova renda" aberto={aberto} onClose={onClose}>
      <form onSubmit={aoEnviar} className="space-y-4">
        {erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <div className="space-y-1">
          <label
            htmlFor="renda-descricao"
            className="text-sm font-medium text-slate-700"
          >
            Descrição
          </label>
          <input
            id="renda-descricao"
            type="text"
            required
            autoFocus
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Salário"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="renda-valor"
              className="text-sm font-medium text-slate-700"
            >
              Valor (R$)
            </label>
            <input
              id="renda-valor"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="renda-mes"
              className="text-sm font-medium text-slate-700"
            >
              Mês
            </label>
            <input
              id="renda-mes"
              type="month"
              required
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="renda-tipo"
            className="text-sm font-medium text-slate-700"
          >
            Tipo
          </label>
          <select
            id="renda-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoRenda)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="FIXA">Fixa</option>
            <option value="FREELA">Freela</option>
            <option value="RETORNO_INVESTIMENTOS">
              Retorno de investimentos
            </option>
          </select>
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
