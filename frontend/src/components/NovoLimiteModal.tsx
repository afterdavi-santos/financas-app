import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarLimite, atualizarLimite } from "../api/limites";
import { criarCategoria } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import type { Categoria, LimiteCategoria } from "../types/financas";

// Valor especial do <select> que abre o campo de "nova categoria" inline.
const OPCAO_NOVA_CATEGORIA = "__nova__";

// Modal de limite de gasto por categoria (teto FIXO, sem mês).
// - Criação: recebe as categorias sem limite ainda (select).
// - Edição (`limite` presente): prefill do valor; a CATEGORIA fica travada,
//   pois o backend só atualiza o valor (não troca a categoria do limite).
interface Props {
  aberto: boolean;
  onClose: () => void;
  onCriado: () => void;
  categorias: Categoria[];
  limite?: LimiteCategoria | null;
}

export function NovoLimiteModal({
  aberto,
  onClose,
  onCriado,
  categorias,
  limite,
}: Props) {
  const editando = !!limite;
  const [categoriaId, setCategoriaId] = useState("");
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const criandoNovaCategoria = categoriaId === OPCAO_NOVA_CATEGORIA;

  // Ao abrir, sincroniza os campos: com limite -> prefill; sem -> limpa.
  // Sem nenhuma categoria disponível na criação, já parte direto para
  // "+ Nova categoria..." (não há outra opção útil no select).
  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setCategoriaId(
      limite
        ? String(limite.categoria.id)
        : categorias.length === 0
          ? OPCAO_NOVA_CATEGORIA
          : "",
    );
    setNovaCategoriaNome("");
    setValor(limite ? String(limite.valorLimite) : "");
  }, [aberto, limite, categorias]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      // Se o usuário escolheu "+ Nova categoria...", cria a categoria antes
      // e usa o id retornado para o limite.
      const idCategoria = criandoNovaCategoria
        ? (await criarCategoria({ nome: novaCategoriaNome })).id
        : Number(categoriaId);

      const req = {
        valorLimite: Number(valor),
        categoriaId: idCategoria,
      };
      if (editando) {
        await atualizarLimite(limite.id, req);
      } else {
        await criarLimite(req);
      }
      onCriado();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal
      titulo={editando ? "Editar limite" : "Novo limite"}
      aberto={aberto}
      onClose={onClose}
    >
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
            autoFocus={!editando}
            disabled={editando} // categoria não muda na edição
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
            {!editando && (
              <option value={OPCAO_NOVA_CATEGORIA}>
                + Nova categoria...
              </option>
            )}
          </select>
        </div>

        {criandoNovaCategoria && (
          <div className="space-y-1">
            <label
              htmlFor="limite-nova-categoria"
              className="text-sm font-medium text-slate-700"
            >
              Nome da nova categoria
            </label>
            <input
              id="limite-nova-categoria"
              type="text"
              required
              autoFocus
              value={novaCategoriaNome}
              onChange={(e) => setNovaCategoriaNome(e.target.value)}
              placeholder="Ex.: Alimentação"
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

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
    </Modal>
  );
}
