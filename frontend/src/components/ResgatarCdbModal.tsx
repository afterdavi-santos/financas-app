import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import {
  posicaoInvestimentoCdb,
  simularResgateCdb,
  simularResgateTotalCdb,
  resgatarInvestimentoCdb,
  resgatarTotalCdb,
} from "../api/investimentosCdb";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import type { InvestimentoCdb, PosicaoCdb, SimulacaoResgate } from "../types/financas";

// Popup de resgate (parcial ou total). Cada botão ("Resgatar" e "Resgatar
// tudo") funciona em DOIS cliques, sem passo de "calcular" separado:
// 1º clique -> simula e mostra o detalhamento de impostos, o próprio botão
// vira "Confirmar resgate"; 2º clique -> efetiva o resgate.
interface Props {
  investimento: InvestimentoCdb | null;
  onClose: () => void;
  onResgatado: () => void;
}

type Modo = "parcial" | "total";

export function ResgatarCdbModal({ investimento, onClose, onResgatado }: Props) {
  const [posicao, setPosicao] = useState<PosicaoCdb | null>(null);
  const [valor, setValor] = useState("");
  const [simulacao, setSimulacao] = useState<SimulacaoResgate | null>(null);
  // Qual dos dois fluxos está com a simulação pronta, aguardando confirmação.
  const [modoPendente, setModoPendente] = useState<Modo | null>(null);
  // Qual botão está processando no momento (calculando ou confirmando).
  const [processando, setProcessando] = useState<Modo | null>(null);
  const [carregandoPosicao, setCarregandoPosicao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Ao abrir num investimento, busca a posição atual e reseta o formulário.
  useEffect(() => {
    if (!investimento) return;
    setErro(null);
    setValor("");
    setSimulacao(null);
    setModoPendente(null);
    setCarregandoPosicao(true);
    posicaoInvestimentoCdb(investimento.id)
      .then(setPosicao)
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregandoPosicao(false));
  }, [investimento]);

  function aoMudarValor(novoValor: string) {
    setValor(novoValor);
    // Valor mudou: uma simulação parcial pendente não vale mais.
    if (modoPendente === "parcial") {
      setModoPendente(null);
      setSimulacao(null);
    }
  }

  async function clicarParcial() {
    if (!investimento) return;
    if (modoPendente === "parcial") {
      await confirmar("parcial");
      return;
    }
    setErro(null);
    setProcessando("parcial");
    try {
      setSimulacao(await simularResgateCdb(investimento.id, Number(valor)));
      setModoPendente("parcial");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(null);
    }
  }

  async function clicarTudo() {
    if (!investimento) return;
    if (modoPendente === "total") {
      await confirmar("total");
      return;
    }
    setErro(null);
    setProcessando("total");
    try {
      setSimulacao(await simularResgateTotalCdb(investimento.id));
      setModoPendente("total");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(null);
    }
  }

  async function confirmar(modo: Modo) {
    if (!investimento) return;
    setErro(null);
    setProcessando(modo);
    try {
      if (modo === "total") {
        await resgatarTotalCdb(investimento.id);
      } else {
        await resgatarInvestimentoCdb(investimento.id, Number(valor));
      }
      onResgatado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(null);
    }
  }

  const outroEmAndamento = processando !== null;

  return (
    <Modal
      titulo={investimento ? `Resgatar — ${investimento.descricao}` : "Resgatar"}
      aberto={investimento !== null}
      onClose={onClose}
    >
      <div className="space-y-4">
        {erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        {carregandoPosicao ? (
          <p className="text-sm text-slate-500">Carregando posição...</p>
        ) : (
          posicao && (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Vale hoje{" "}
              <strong className="text-slate-800">
                {formatarBRL(posicao.valorAtual)}
              </strong>{" "}
              ({formatarBRL(posicao.rendimentoBruto)} de rendimento em{" "}
              {posicao.diasUteisRendidos} dias úteis)
            </p>
          )
        )}

        <div className="space-y-1">
          <label
            htmlFor="resgate-valor"
            className="text-sm font-medium text-slate-700"
          >
            Quanto você quer RECEBER? (R$)
          </label>
          <input
            id="resgate-valor"
            type="number"
            step="0.01"
            min="0.01"
            max={posicao?.valorAtual}
            value={valor}
            onChange={(e) => aoMudarValor(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {simulacao && (
          <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm">
            {simulacao.percentualIof > 0 && (
              <div className="flex justify-between text-red-700">
                <span>IOF sobre o rendimento ({simulacao.percentualIof.toFixed(0)}%)</span>
                <span>- {formatarBRL(simulacao.valorIof)}</span>
              </div>
            )}
            <div className="flex justify-between text-red-700">
              <span>IR sobre o rendimento ({simulacao.percentualIr.toFixed(1)}%)</span>
              <span>- {formatarBRL(simulacao.valorIr)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Valor descontado com os impostos</span>
              <span>{formatarBRL(simulacao.valorBrutoRetirado)}</span>
            </div>
            <div className="flex justify-between border-t border-indigo-200 pt-2 font-semibold text-slate-800">
              <span>Você recebe</span>
              <span>{formatarBRL(simulacao.valorLiquido)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={clicarParcial}
            disabled={!valor || (outroEmAndamento && processando !== "parcial")}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {processando === "parcial"
              ? modoPendente === "parcial"
                ? "Confirmando..."
                : "Calculando..."
              : modoPendente === "parcial"
                ? "Confirmar resgate"
                : "Resgatar"}
          </button>
          <button
            type="button"
            onClick={clicarTudo}
            disabled={outroEmAndamento && processando !== "total"}
            className="flex-1 rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60"
          >
            {processando === "total"
              ? modoPendente === "total"
                ? "Confirmando..."
                : "Calculando..."
              : modoPendente === "total"
                ? "Confirmar resgate"
                : "Resgatar tudo"}
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
