import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { statusLimiteOuNulo } from "../api/limites";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { primeiroDiaDoMesISO } from "../utils/datas";
import type { Categoria } from "../types/financas";

// Simulador de despesa: sem gravar nada, informa se um valor hipotético numa
// categoria estouraria o limite do mês e, se não, quanto ainda sobraria.
interface Props {
  aberto: boolean;
  onClose: () => void;
  categorias: Categoria[];
}

// Resultado da simulação, já pronto para exibir.
interface Resultado {
  temLimite: boolean;
  estoura: boolean;
  limite: number;
  novoTotal: number;
  sobra: number; // >= 0 quando não estoura; excedente quando estoura (negativo da sobra)
  pctSobra: number; // % do limite que ainda sobra (0 se estourar)
}

export function SimularDespesaModal({ aberto, onClose, categorias }: Props) {
  const [categoriaId, setCategoriaId] = useState("");
  const [valor, setValor] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const semCategorias = categorias.length === 0;

  // Ao abrir, limpa o formulário e o resultado anterior.
  useEffect(() => {
    if (!aberto) return;
    setCategoriaId("");
    setValor("");
    setResultado(null);
    setErro(null);
  }, [aberto]);

  async function aoSimular(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setResultado(null);
    setCarregando(true);
    try {
      const status = await statusLimiteOuNulo(
        Number(categoriaId),
        primeiroDiaDoMesISO(),
      );
      if (!status) {
        setResultado({
          temLimite: false,
          estoura: false,
          limite: 0,
          novoTotal: 0,
          sobra: 0,
          pctSobra: 0,
        });
        return;
      }
      const novoTotal = status.valorGasto + Number(valor);
      const sobra = status.valorLimite - novoTotal;
      setResultado({
        temLimite: true,
        estoura: sobra < 0,
        limite: status.valorLimite,
        novoTotal,
        sobra,
        pctSobra:
          status.valorLimite > 0 && sobra > 0
            ? (sobra / status.valorLimite) * 100
            : 0,
      });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal titulo="Simular despesa" aberto={aberto} onClose={onClose}>
      {semCategorias ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Crie uma categoria (e um limite) antes de simular uma despesa.
        </p>
      ) : (
        <form onSubmit={aoSimular} className="space-y-4">
          {erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <div className="space-y-1">
            <label
              htmlFor="sim-categoria"
              className="text-sm font-medium text-slate-700"
            >
              Categoria
            </label>
            <select
              id="sim-categoria"
              required
              autoFocus
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="sim-valor"
              className="text-sm font-medium text-slate-700"
            >
              Valor simulado (R$)
            </label>
            <input
              id="sim-valor"
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

          {/* Resultado da simulação. */}
          {resultado &&
            (!resultado.temLimite ? (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                Essa categoria não tem limite definido neste mês.
              </p>
            ) : resultado.estoura ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                ⚠️ Estoura o limite: ficaria em{" "}
                {formatarBRL(resultado.novoTotal)} de{" "}
                {formatarBRL(resultado.limite)} —{" "}
                <strong>{formatarBRL(-resultado.sobra)}</strong> acima do teto.
              </p>
            ) : (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Não estoura. Ainda sobrariam{" "}
                <strong>{formatarBRL(resultado.sobra)}</strong> (
                {resultado.pctSobra.toFixed(0)}%) do limite neste mês.
              </p>
            ))}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {carregando ? "Simulando..." : "Simular"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
