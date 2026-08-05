import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarInvestimentoCdb, atualizarInvestimentoCdb } from "../api/investimentosCdb";
import { criarObjetivo, vincularInvestimento, desvincularInvestimento } from "../api/objetivos";
import { cdiAtual } from "../api/cdi";
import { mensagemDeErro } from "../api/erros";
import { hojeISO } from "../utils/datas";
import { dataBR } from "../utils/rotulos";
import type { CdiAtual, InvestimentoCdb, Objetivo } from "../types/financas";

// Valor especial do <select> de meta que abre os campos de "novo objetivo" inline.
const OPCAO_NOVO_OBJETIVO = "__novo__";

// Modal de investimento CDB: descrição, valor aplicado, % do CDI, data de
// aplicação e, opcionalmente, vínculo com uma meta (existente ou criada aqui
// mesmo). `investimento` (opcional) coloca o modal em modo EDIÇÃO.
interface Props {
  aberto: boolean;
  onClose: () => void;
  onSalvo: () => void;
  investimento?: InvestimentoCdb | null;
  objetivos: Objetivo[];
}

export function NovoInvestimentoCdbModal({
  aberto,
  onClose,
  onSalvo,
  investimento,
  objetivos,
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

  // --- Vínculo com meta (opcional) -------------------------------------
  // "" = nenhuma meta; OPCAO_NOVO_OBJETIVO = criar uma nova aqui; senão, o id
  // (string) de uma meta já existente.
  const [objetivoSelecionado, setObjetivoSelecionado] = useState("");
  const [novoObjDescricao, setNovoObjDescricao] = useState("");
  const [novoObjIncentivo, setNovoObjIncentivo] = useState("");
  const [novoObjValorAlvo, setNovoObjValorAlvo] = useState("");
  const [novoObjDataAlvo, setNovoObjDataAlvo] = useState("");

  const criandoNovoObjetivo = objetivoSelecionado === OPCAO_NOVO_OBJETIVO;

  // Metas disponíveis: sem vínculo com NENHUM investimento, ou (na edição) já
  // vinculada a ESTE investimento (senão ela some do próprio select ao editar).
  const objetivosDisponiveis = objetivos.filter(
    (o) => o.investimentoCdbId == null || (editando && o.investimentoCdbId === investimento!.id),
  );

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setDescricao(investimento?.descricao ?? "");
    setValorAplicado(investimento ? String(investimento.valorAplicado) : "");
    setPercentualCdi(investimento ? String(investimento.percentualCdi) : "100");
    setDataAplicacao(investimento?.dataAplicacao ?? hojeISO());
    setObjetivoSelecionado(investimento?.objetivoId != null ? String(investimento.objetivoId) : "");
    setNovoObjDescricao("");
    setNovoObjIncentivo("");
    setNovoObjValorAlvo("");
    setNovoObjDataAlvo("");
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
      const investimentoId = editando
        ? investimento.id
        : (await criarInvestimentoCdb(req)).id;
      if (editando) {
        await atualizarInvestimentoCdb(investimento.id, req);
      }

      // Resolve o id da meta-alvo desta submissão (null = nenhuma).
      let objetivoAlvoId: number | null = null;
      if (criandoNovoObjetivo) {
        const novo = await criarObjetivo({
          descricao: novoObjDescricao,
          incentivo: novoObjIncentivo.trim() || null,
          valorAlvo: Number(novoObjValorAlvo),
          dataAlvo: novoObjDataAlvo,
        });
        objetivoAlvoId = novo.id;
      } else if (objetivoSelecionado) {
        objetivoAlvoId = Number(objetivoSelecionado);
      }

      const objetivoAtualId = investimento?.objetivoId ?? null;
      if (objetivoAtualId !== objetivoAlvoId) {
        // Desvincula a meta antiga ANTES de vincular a nova: o backend recusa
        // vincular um investimento que já está preso a outra meta.
        if (objetivoAtualId != null) {
          await desvincularInvestimento(objetivoAtualId);
        }
        if (objetivoAlvoId != null) {
          await vincularInvestimento(objetivoAlvoId, investimentoId);
        }
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

        <div className="space-y-1">
          <label
            htmlFor="cdb-objetivo"
            className="text-sm font-medium text-grouper-navy"
          >
            Meta vinculada <span className="text-grouper-navy/50">(opcional)</span>
          </label>
          <select
            id="cdb-objetivo"
            value={objetivoSelecionado}
            onChange={(e) => setObjetivoSelecionado(e.target.value)}
            className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
          >
            <option value="">Nenhuma</option>
            {objetivosDisponiveis.map((o) => (
              <option key={o.id} value={o.id}>
                {o.descricao}
              </option>
            ))}
            <option value={OPCAO_NOVO_OBJETIVO}>+ Novo objetivo...</option>
          </select>
          {objetivoSelecionado && !criandoNovoObjetivo && (
            <p className="text-xs text-grouper-navy/60">
              O progresso desta meta passa a acompanhar a posição do
              investimento em tempo real, no lugar dos aportes manuais.
            </p>
          )}
        </div>

        {criandoNovoObjetivo && (
          <div className="space-y-4 rounded-md border border-grouper-sky/30 bg-grouper-mist/40 p-3">
            <div className="space-y-1">
              <label
                htmlFor="cdb-novo-obj-descricao"
                className="text-sm font-medium text-grouper-navy"
              >
                Descrição da meta
              </label>
              <input
                id="cdb-novo-obj-descricao"
                type="text"
                required
                value={novoObjDescricao}
                onChange={(e) => setNovoObjDescricao(e.target.value)}
                placeholder="Ex.: Reserva de emergência"
                className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="cdb-novo-obj-incentivo"
                className="text-sm font-medium text-grouper-navy"
              >
                Incentivo <span className="text-grouper-navy/50">(opcional)</span>
              </label>
              <textarea
                id="cdb-novo-obj-incentivo"
                rows={2}
                value={novoObjIncentivo}
                onChange={(e) => setNovoObjIncentivo(e.target.value)}
                placeholder="Um lembrete de por que essa meta importa."
                className="w-full resize-none rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="cdb-novo-obj-valor"
                  className="text-sm font-medium text-grouper-navy"
                >
                  Valor-alvo (R$)
                </label>
                <input
                  id="cdb-novo-obj-valor"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={novoObjValorAlvo}
                  onChange={(e) => setNovoObjValorAlvo(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="cdb-novo-obj-data"
                  className="text-sm font-medium text-grouper-navy"
                >
                  Data-alvo
                </label>
                <input
                  id="cdb-novo-obj-data"
                  type="date"
                  required
                  value={novoObjDataAlvo}
                  onChange={(e) => setNovoObjDataAlvo(e.target.value)}
                  className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
                />
              </div>
            </div>
          </div>
        )}

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
