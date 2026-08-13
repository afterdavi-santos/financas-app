import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import {
  posicaoInvestimentoCdb,
  simularResgateCdb,
  resgatarInvestimentoCdb,
} from "../api/investimentosCdb";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import type { InvestimentoCdb, PosicaoCdb, SimulacaoResgate } from "../types/financas";

// Popup de resgate parcial. O botão "Resgatar" funciona em DOIS cliques, sem
// passo de "calcular" separado: 1º clique -> simula e mostra o detalhamento
// de impostos, o próprio botão vira "Confirmar resgate"; 2º clique -> efetiva
// o resgate.
interface Props {
  investimento: InvestimentoCdb | null;
  onClose: () => void;
  onResgatado: () => void;
}

export function ResgatarCdbModal({ investimento, onClose, onResgatado }: Props) {
  const [posicao, setPosicao] = useState<PosicaoCdb | null>(null);
  const [valor, setValor] = useState("");
  const [simulacao, setSimulacao] = useState<SimulacaoResgate | null>(null);
  // Simulação pronta, aguardando confirmação (2º clique).
  const [simulacaoPendente, setSimulacaoPendente] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [carregandoPosicao, setCarregandoPosicao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Ao abrir num investimento, busca a posição atual e reseta o formulário.
  useEffect(() => {
    if (!investimento) return;
    setErro(null);
    setValor("");
    setSimulacao(null);
    setSimulacaoPendente(false);
    setCarregandoPosicao(true);
    posicaoInvestimentoCdb(investimento.id)
      .then(setPosicao)
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregandoPosicao(false));
  }, [investimento]);

  function aoMudarValor(novoValor: string) {
    setValor(novoValor);
    // Valor mudou: a simulação pendente não vale mais.
    if (simulacaoPendente) {
      setSimulacaoPendente(false);
      setSimulacao(null);
    }
  }

  async function clicarResgatar() {
    if (!investimento) return;
    if (simulacaoPendente) {
      await confirmar();
      return;
    }
    setErro(null);
    setProcessando(true);
    try {
      setSimulacao(await simularResgateCdb(investimento.id, Number(valor)));
      setSimulacaoPendente(true);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  async function confirmar() {
    if (!investimento) return;
    setErro(null);
    setProcessando(true);
    try {
      await resgatarInvestimentoCdb(investimento.id, Number(valor));
      onResgatado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

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
            onClick={clicarResgatar}
            disabled={!valor || processando}
            className="flex-1 rounded-md bg-grouper-mid px-4 py-2 text-sm font-medium text-white hover:bg-grouper-deep disabled:opacity-60"
          >
            {processando
              ? simulacaoPendente
                ? "Confirmando..."
                : "Calculando..."
              : simulacaoPendente
                ? "Confirmar resgate"
                : "Resgatar"}
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
