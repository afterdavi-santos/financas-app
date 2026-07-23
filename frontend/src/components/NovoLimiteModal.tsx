import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarLimite } from "../api/limites";
import { mensagemDeErro } from "../api/erros";
import type { Categoria } from "../types/financas";

// Modal do form de novo limite de gasto por categoria.
// Recebe as categorias (para o select) e o mês em foco na página (mesPadrao,
// no formato "YYYY-MM"), para o novo limite já cair no mês que está sendo visto.
interface Props {
  aberto: boolean;
  onClose: () => void;
  onCriado: () => void;
  categorias: Categoria[];
  mesPadrao: string; // "YYYY-MM"
}

export function NovoLimiteModal({
  aberto,
  onClose,
  onCriado,
  categorias,
  mesPadrao,
}: Props) {
  const [categoriaId, setCategoriaId] = useState("");
  const [valor, setValor] = useState("");
  const [mes, setMes] = useState(mesPadrao); // "YYYY-MM"
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const semCategorias = categorias.length === 0;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await criarLimite({
        valorLimite: Number(valor),
        mesReferencia: `${mes}-01`, // "YYYY-MM" -> "YYYY-MM-01"
        categoriaId: Number(categoriaId),
      });
      setCategoriaId("");
      setValor("");
      setMes(mesPadrao);
      onCriado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal titulo="Novo limite" aberto={aberto} onClose={onClose}>
      {semCategorias ? (
        // Sem categoria não dá para definir um teto (categoriaId é obrigatório).
        <div className="space-y-4">
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Você precisa criar uma categoria antes de definir um limite.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={aoEnviar} className="space-y-4">
          {erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <div className="space-y-1">
            <label
              htmlFor="limite-categoria"
              className="text-sm font-medium text-slate-700"
            >
              Categoria
            </label>
            <select
              id="limite-categoria"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="limite-valor"
                className="text-sm font-medium text-slate-700"
              >
                Limite (R$)
              </label>
              <input
                id="limite-valor"
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

            <div className="space-y-1">
              <label
                htmlFor="limite-mes"
                className="text-sm font-medium text-slate-700"
              >
                Mês
              </label>
              <input
                id="limite-mes"
                type="month"
                required
                value={mes}
                onChange={(e) => setMes(e.target.value)}
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
      )}
    </Modal>
  );
}
