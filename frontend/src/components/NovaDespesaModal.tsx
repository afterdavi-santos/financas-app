import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarDespesa } from "../api/despesas";
import { mensagemDeErro } from "../api/erros";
import { hojeISO } from "../utils/datas";
import type { Categoria, TipoDespesa } from "../types/financas";

// Modal do form de nova despesa. Recebe a lista de categorias (para o select)
// já carregada pela home, evitando uma segunda requisição aqui.
interface Props {
  aberto: boolean;
  onClose: () => void;
  onCriada: () => void;
  categorias: Categoria[];
}

export function NovaDespesaModal({
  aberto,
  onClose,
  onCriada,
  categorias,
}: Props) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(""); // string no input; convertida ao enviar
  const [data, setData] = useState(hojeISO()); // default: hoje
  const [tipo, setTipo] = useState<TipoDespesa>("EXTRAORDINARIA");
  const [categoriaId, setCategoriaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const semCategorias = categorias.length === 0;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await criarDespesa({
        descricao,
        valor: Number(valor), // <input> devolve string; backend espera número
        data,
        tipo,
        categoriaId: Number(categoriaId),
      });
      // limpa os campos para o próximo uso
      setDescricao("");
      setValor("");
      setData(hojeISO());
      setTipo("EXTRAORDINARIA");
      setCategoriaId("");
      onCriada();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal titulo="Nova despesa" aberto={aberto} onClose={onClose}>
      {semCategorias ? (
        // Sem categoria não dá para lançar despesa (categoriaId é obrigatório).
        <div className="space-y-4">
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Você precisa criar uma categoria antes de lançar uma despesa.
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
              htmlFor="descricao"
              className="text-sm font-medium text-slate-700"
            >
              Descrição
            </label>
            <input
              id="descricao"
              type="text"
              required
              autoFocus
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Mercado"
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="valor"
                className="text-sm font-medium text-slate-700"
              >
                Valor (R$)
              </label>
              <input
                id="valor"
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
                htmlFor="data"
                className="text-sm font-medium text-slate-700"
              >
                Data
              </label>
              <input
                id="data"
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="tipo"
                className="text-sm font-medium text-slate-700"
              >
                Tipo
              </label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoDespesa)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXTRAORDINARIA">Extraordinária</option>
                <option value="FIXA">Fixa</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="categoria"
                className="text-sm font-medium text-slate-700"
              >
                Categoria
              </label>
              <select
                id="categoria"
                required
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
