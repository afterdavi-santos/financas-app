import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { SeletorMes } from "./SeletorMes";
import { criarRenda, atualizarRenda } from "../api/rendas";
import { mensagemDeErro } from "../api/erros";
import { primeiroDiaDoMesISO } from "../utils/datas";
import type { Renda, TipoRenda } from "../types/financas";

// Modal do form de renda: descricao, valor e mês de referência.
// O SeletorMes devolve "YYYY-MM"; o backend espera "YYYY-MM-DD", então
// completamos com "-01" (1º dia do mês) ao enviar.
// `renda` (opcional) coloca o modal em modo EDIÇÃO — prefill + PUT em vez de POST.
// `mesPadrao` (opcional, "YYYY-MM") define o mês inicial do form — as telas
// com seletor de mês (Home, Rendas) passam o mês em foco, pra já abrir o
// modal apontando pra lá; sem ele, usa o mês atual.
interface Props {
  aberto: boolean;
  onClose: () => void;
  onCriada: () => void;
  renda?: Renda | null;
  mesPadrao?: string;
}

// "2026-07-01" -> "2026-07" (valor que o SeletorMes entende).
function mesInicial(): string {
  return primeiroDiaDoMesISO().slice(0, 7);
}

export function NovaRendaModal({ aberto, onClose, onCriada, renda, mesPadrao }: Props) {
  const editando = !!renda;
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [mes, setMes] = useState(mesPadrao ?? mesInicial()); // "YYYY-MM"
  const [tipo, setTipo] = useState<TipoRenda>("FIXA");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Ao abrir, sincroniza os campos: com renda -> prefill; sem -> limpa,
  // usando o mês em foco atual (mesPadrao) da tela que abriu o modal.
  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setDescricao(renda?.descricao ?? "");
    setValor(renda ? String(renda.valor) : "");
    setMes(renda ? renda.mesReferencia.slice(0, 7) : (mesPadrao ?? mesInicial()));
    setTipo(renda?.tipo ?? "FIXA");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, renda, mesPadrao]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const req = {
        descricao,
        valor: Number(valor),
        mesReferencia: `${mes}-01`, // "YYYY-MM" -> "YYYY-MM-01"
        tipo,
      };
      if (editando) {
        await atualizarRenda(renda.id, req);
      } else {
        await criarRenda(req);
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
      titulo={editando ? "Editar renda" : "Nova renda"}
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
            htmlFor="renda-descricao"
            className="text-sm font-medium text-grouper-navy"
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
            className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="renda-valor"
              className="text-sm font-medium text-grouper-navy"
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
              className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="renda-mes"
              className="text-sm font-medium text-grouper-navy"
            >
              Mês
            </label>
            <SeletorMes id="renda-mes" value={mes} onChange={setMes} variant="formulario" />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="renda-tipo"
            className="text-sm font-medium text-grouper-navy"
          >
            Tipo
          </label>
          <select
            id="renda-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoRenda)}
            className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
          >
            <option value="FIXA">Fixa</option>
            <option value="FREELA">Renda variável</option>
            {/* "Retorno de investimentos" não é mais criável aqui — só existe
                via resgate de um Investimento CDB (aba Início). Mantemos a
                option escondida só quando o registro editado já é desse tipo,
                pra não trocar silenciosamente o tipo dele ao salvar. */}
            {tipo === "RETORNO_INVESTIMENTOS" && (
              <option value="RETORNO_INVESTIMENTOS">
                Retorno de investimentos
              </option>
            )}
          </select>
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
