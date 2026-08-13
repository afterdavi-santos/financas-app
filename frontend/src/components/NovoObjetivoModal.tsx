import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { SeletorData } from "./SeletorData";
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
  const [incentivo, setIncentivo] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [dataAlvo, setDataAlvo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Ao abrir, sincroniza os campos: com objetivo -> prefill; sem -> limpa.
  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setDescricao(objetivo?.descricao ?? "");
    setIncentivo(objetivo?.incentivo ?? "");
    setValorAlvo(objetivo ? String(objetivo.valorAlvo) : "");
    setDataAlvo(objetivo?.dataAlvo ?? "");
  }, [aberto, objetivo]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const req = {
        descricao,
        // envia null quando vazio (campo opcional no backend)
        incentivo: incentivo.trim() || null,
        valorAlvo: Number(valorAlvo),
        dataAlvo,
      };
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
          <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
            {erro}
          </p>
        )}

        <div className="space-y-1">
          <label
            htmlFor="obj-descricao"
            className="text-sm font-medium text-grouper-navy"
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
            className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="obj-incentivo"
            className="text-sm font-medium text-grouper-navy"
          >
            Incentivo <span className="text-grouper-navy/50">(opcional)</span>
          </label>
          <textarea
            id="obj-incentivo"
            rows={2}
            value={incentivo}
            onChange={(e) => setIncentivo(e.target.value)}
            placeholder="Um lembrete de por que essa meta importa. Ex.: 6 meses de tranquilidade."
            className="w-full resize-none rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="obj-valor"
              className="text-sm font-medium text-grouper-navy"
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
              className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="obj-data"
              className="text-sm font-medium text-grouper-navy"
            >
              Data-alvo
            </label>
            <SeletorData
              id="obj-data"
              value={dataAlvo}
              onChange={setDataAlvo}
              className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carregando}
            className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-deep disabled:opacity-60"
          >
            {carregando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
