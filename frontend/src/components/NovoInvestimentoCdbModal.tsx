import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarInvestimentoCdb, atualizarInvestimentoCdb } from "../api/investimentosCdb";
import { cdiAtual } from "../api/cdi";
import { mensagemDeErro } from "../api/erros";
import { hojeISO } from "../utils/datas";
import { dataBR } from "../utils/rotulos";
import type { CdiAtual, InvestimentoCdb } from "../types/financas";

// Modal de investimento CDB: descrição, valor aplicado, % do CDI e data de
// aplicação. `investimento` (opcional) coloca o modal em modo EDIÇÃO.
interface Props {
  aberto: boolean;
  onClose: () => void;
  onSalvo: () => void;
  investimento?: InvestimentoCdb | null;
}

export function NovoInvestimentoCdbModal({
  aberto,
  onClose,
  onSalvo,
  investimento,
}: Props) {
  const editando = !!investimento;
  const [descricao, setDescricao] = useState("");
  const [valorAplicado, setValorAplicado] = useState("");
  const [percentualCdi, setPercentualCdi] = useState("100");
  const [dataAplicacao, setDataAplicacao] = useState(hojeISO());
  const [cdi, setCdi] = useState<CdiAtual | null>(null);
  const [cdiErro, setCdiErro] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setDescricao(investimento?.descricao ?? "");
    setValorAplicado(investimento ? String(investimento.valorAplicado) : "");
    setPercentualCdi(investimento ? String(investimento.percentualCdi) : "100");
    setDataAplicacao(investimento?.dataAplicacao ?? hojeISO());
    setCdiErro(false);
    cdiAtual()
      .then(setCdi)
      .catch(() => setCdiErro(true));
  }, [aberto, investimento]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const req = {
        descricao,
        valorAplicado: Number(valorAplicado),
        percentualCdi: Number(percentualCdi),
        dataAplicacao,
      };
      if (editando) {
        await atualizarInvestimentoCdb(investimento.id, req);
      } else {
        await criarInvestimentoCdb(req);
      }
      onSalvo();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal
      titulo={editando ? "Editar investimento CDB" : "Novo investimento CDB"}
      aberto={aberto}
      onClose={onClose}
    >
      <form onSubmit={aoEnviar} className="space-y-4">
        {erro && (
          <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
            {erro}
          </p>
        )}

        {cdi && (
          <p className="rounded-md border-l-4 border-grouper-sky bg-grouper-mist px-3 py-2 text-xs text-grouper-navy">
            CDI atual: {cdi.taxaDiariaPercentual.toFixed(4)}% ao dia (~
            {cdi.taxaAnualizadaPercentual.toFixed(2)}% ao ano, ref.{" "}
            {dataBR(cdi.data)})
          </p>
        )}
        {cdiErro && (
          <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-xs text-grouper-ink">
            Não consegui buscar o CDI atual agora. Você ainda pode salvar; o
            rendimento é calculado depois.
          </p>
        )}

        <div className="space-y-1">
          <label
            htmlFor="cdb-descricao"
            className="text-sm font-medium text-grouper-navy"
          >
            Descrição
          </label>
          <input
            id="cdb-descricao"
            type="text"
            required
            autoFocus
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: CDB Banco XP"
            className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
          />
        </div>

        {/* Valor aplicado e data só fazem sentido na criação: depois disso,
            cada aporte ("investir mais") vira um lote próprio — editar aqui
            não mudaria o saldo real, então escondemos na edição. */}
        {!editando && (
          <>
            <div className="space-y-1">
              <label
                htmlFor="cdb-valor"
                className="text-sm font-medium text-grouper-navy"
              >
                Valor aplicado (R$)
              </label>
              <input
                id="cdb-valor"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={valorAplicado}
                onChange={(e) => setValorAplicado(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="cdb-data"
                className="text-sm font-medium text-grouper-navy"
              >
                Data de aplicação
              </label>
              <input
                id="cdb-data"
                type="date"
                required
                max={hojeISO()}
                value={dataAplicacao}
                onChange={(e) => setDataAplicacao(e.target.value)}
                className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <label
            htmlFor="cdb-percentual"
            className="text-sm font-medium text-grouper-navy"
          >
            % do CDI
          </label>
          <input
            id="cdb-percentual"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={percentualCdi}
            onChange={(e) => setPercentualCdi(e.target.value)}
            placeholder="Ex.: 105"
            className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-grouper-navy hover:bg-grouper-mist"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carregando}
            className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-grouper-deep disabled:opacity-60"
          >
            {carregando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
