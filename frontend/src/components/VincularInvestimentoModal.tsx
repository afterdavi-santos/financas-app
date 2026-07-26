import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { vincularInvestimento, desvincularInvestimento } from "../api/objetivos";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import type { InvestimentoCdb, Objetivo } from "../types/financas";

// Vincula/desvincula um investimento CDB a um objetivo: uma vez vinculado, o
// progresso da meta passa a ser a posição ATUAL do investimento (ao vivo),
// em vez do saldo de aportes manuais — por isso aportar fica bloqueado
// enquanto o vínculo existir (a própria ObjetivosPage já esconde o botão).
interface Props {
  objetivo: Objetivo | null; // null = modal fechado
  investimentos: InvestimentoCdb[]; // todos os investimentos do usuário (ativos e encerrados)
  onClose: () => void;
  onAlterado: () => void;
}

export function VincularInvestimentoModal({
  objetivo,
  investimentos,
  onClose,
  onAlterado,
}: Props) {
  const [investimentoCdbId, setInvestimentoCdbId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (objetivo) {
      setInvestimentoCdbId("");
      setErro(null);
    }
  }, [objetivo]);

  if (!objetivo) return null;

  const jaVinculado = objetivo.investimentoCdbId != null;

  // Só oferece investimentos ATIVOS e que não estejam vinculados a OUTRO objetivo.
  const disponiveis = investimentos.filter(
    (i) => i.dataResgate === null && (i.objetivoId == null || i.objetivoId === objetivo.id),
  );

  async function aoVincular() {
    setErro(null);
    setCarregando(true);
    try {
      await vincularInvestimento(objetivo!.id, Number(investimentoCdbId));
      onAlterado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  async function aoDesvincular() {
    setErro(null);
    setCarregando(true);
    try {
      await desvincularInvestimento(objetivo!.id);
      onAlterado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal titulo="Vincular investimento" aberto onClose={onClose}>
      <div className="space-y-4">
        {erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        {jaVinculado ? (
          <>
            <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
              Vinculado a <strong>{objetivo.investimentoCdbDescricao}</strong>.
              O progresso desta meta acompanha a posição do investimento — para
              aportar manualmente, desvincule primeiro.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={carregando}
                onClick={aoDesvincular}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {carregando ? "Desvinculando..." : "Desvincular"}
              </button>
            </div>
          </>
        ) : disponiveis.length === 0 ? (
          <>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Nenhum investimento CDB ativo disponível para vincular (crie um
              na Home, ou ele já pode estar vinculado a outra meta).
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <label
                htmlFor="vincular-investimento"
                className="text-sm font-medium text-slate-700"
              >
                Investimento CDB
              </label>
              <select
                id="vincular-investimento"
                required
                autoFocus
                value={investimentoCdbId}
                onChange={(e) => setInvestimentoCdbId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {disponiveis.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.descricao} ({formatarBRL(i.valorAplicado)})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              O progresso desta meta passará a acompanhar a posição do
              investimento em tempo real, no lugar dos aportes manuais.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={carregando || !investimentoCdbId}
                onClick={aoVincular}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {carregando ? "Vinculando..." : "Vincular"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
