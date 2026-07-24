import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarObjetivo, atualizarObjetivo } from "../api/objetivos";
import { mensagemDeErro } from "../api/erros";
import type { Objetivo } from "../types/financas";

// Modal de objetivo: descrição, valor-alvo e data-alvo.
// `objetivo` (opcional) coloca o modal em modo EDIÇÃO — prefill + PUT em vez de POST.
interface Props {
  aberto: boolean;
  onClose: () => void;
  onCriada: () => void;
  objetivo?: Objetivo | null;
}

export function NovoObjetivoModal({
  aberto,
  onClose,
  onCriada,
  objetivo,
}: Props) {
  const editando = !!objetivo;
  const [descricao, setDescricao] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [dataAlvo, setDataAlvo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Ao abrir, sincroniza os campos: com objetivo -> prefill; sem -> limpa.
  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setDescricao(objetivo?.descricao ?? "");
    setValorAlvo(objetivo ? String(objetivo.valorAlvo) : "");
    setDataAlvo(objetivo?.dataAlvo ?? "");
  }, [aberto, objetivo]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const req = { descricao, valorAlvo: Number(valorAlvo), dataAlvo };
      if (editando) {
        await atualizarObjetivo(objetivo.id, req);
      } else {
        await criarObjetivo(req);
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
      titulo={editando ? "Editar objetivo" : "Novo objetivo"}
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
          <label
            htmlFor="obj-descricao"
            className="text-sm font-medium text-slate-700"
          >
            Descrição
          </label>
          <input
            id="obj-descricao"
            type="text"
            required
            autoFocus
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Reserva de emergência"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="obj-valor"
              className="text-sm font-medium text-slate-700"
            >
              Valor-alvo (R$)
            </label>
            <input
              id="obj-valor"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={valorAlvo}
              onChange={(e) => setValorAlvo(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="obj-data"
              className="text-sm font-medium text-slate-700"
            >
              Data-alvo
            </label>
            <input
              id="obj-data"
              type="date"
              required
              value={dataAlvo}
              onChange={(e) => setDataAlvo(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
