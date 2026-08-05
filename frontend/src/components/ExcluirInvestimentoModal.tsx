import { useState } from "react";
import { Modal } from "./Modal";
import { excluirInvestimentoCdb } from "../api/investimentosCdb";
import { excluirObjetivo } from "../api/objetivos";
import { mensagemDeErro } from "../api/erros";
import type { InvestimentoCdb } from "../types/financas";

// Popup de exclusão de investimento CDB — substitui o confirm() nativo.
// Quando o investimento está vinculado a uma meta, oferece explicitamente as
// duas opções (excluir só o investimento — a meta fica só desvinculada — ou
// excluir os dois) em vez de apagar a meta silenciosamente.
interface Props {
  investimento: InvestimentoCdb | null;
  onClose: () => void;
  onExcluido: () => void;
}

export function ExcluirInvestimentoModal({ investimento, onClose, onExcluido }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (!investimento) return null;

  const vinculado = investimento.objetivoId != null;

  async function excluirSoInvestimento() {
    setErro(null);
    setCarregando(true);
    try {
      // O backend já desvincula automaticamente a meta antes de excluir o
      // investimento — ela continua existindo, só sem o vínculo.
      await excluirInvestimentoCdb(investimento!.id);
      onExcluido();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  async function excluirInvestimentoEMeta() {
    setErro(null);
    setCarregando(true);
    try {
      // Exclui a meta primeiro: quando o investimento sumir em seguida, o
      // backend não encontra mais nenhuma meta vinculada a ele (não-op).
      await excluirObjetivo(investimento!.objetivoId!);
      await excluirInvestimentoCdb(investimento!.id);
      onExcluido();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal titulo="Excluir investimento" aberto onClose={onClose}>
      <div className="space-y-4">
        {erro && (
          <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
            {erro}
          </p>
        )}

        {!vinculado ? (
          <>
            <p className="text-sm text-grouper-navy">
              Excluir o investimento <strong>"{investimento.descricao}"</strong>?
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-grouper-navy hover:bg-grouper-mist"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={excluirSoInvestimento}
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
              O investimento <strong>"{investimento.descricao}"</strong> está
              vinculado à meta <strong>"{investimento.objetivoDescricao}"</strong>.
              O que você quer fazer?
            </p>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              "Excluir só o investimento" mantém a meta, só desvinculada dele
              (o progresso volta a ser o saldo de aportes manuais). "Excluir os
              dois" apaga a meta junto — essa ação não pode ser desfeita.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-grouper-navy hover:bg-grouper-mist"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={excluirSoInvestimento}
                disabled={carregando}
                className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-grouper-deep disabled:opacity-60"
              >
                {carregando ? "Excluindo..." : "Excluir só o investimento"}
              </button>
              <button
                type="button"
                onClick={excluirInvestimentoEMeta}
                disabled={carregando}
                className="rounded-md bg-red-600 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-red-700 disabled:opacity-60"
              >
                {carregando ? "Excluindo..." : "Excluir os dois"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
