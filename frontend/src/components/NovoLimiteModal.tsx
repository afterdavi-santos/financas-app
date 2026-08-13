import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarLimite, atualizarLimite } from "../api/limites";
import { criarCategoria } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import { SeletorCategoria, OPCAO_NOVA_CATEGORIA } from "./SeletorCategoria";
import { AvisoCategoriaSemelhante } from "./AvisoCategoriaSemelhante";
import { useCategoriasSemelhantes } from "../hooks/useCategoriasSemelhantes";
import type { Categoria, LimiteCategoria, TipoCategoria } from "../types/financas";

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
  const [novaCategoriaTipo, setNovaCategoriaTipo] = useState<TipoCategoria>("VARIAVEL");
  const { sugestoes: categoriasSemelhantes } = useCategoriasSemelhantes(novaCategoriaNome, categorias);
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
    setNovaCategoriaTipo("VARIAVEL");
    setValor(limite ? String(limite.valorLimite) : "");
  }, [aberto, limite, categorias]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }
    setCarregando(true);
    try {
      // Se o usuário escolheu "+ Nova categoria...", cria a categoria antes
      // e usa o id retornado para o limite.
      const idCategoria = criandoNovaCategoria
        ? (await criarCategoria({ nome: novaCategoriaNome, tipo: novaCategoriaTipo })).id
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
          <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
            {erro}
          </p>
        )}

        <div className="space-y-1">
          <label
            htmlFor="limite-categoria"
            className="text-sm font-medium text-grouper-navy"
          >
            Categoria
          </label>
          {editando ? (
            // Categoria não é editável aqui (o backend só atualiza o valor
            // do limite) — mostra só o nome, sem a lista/rolagem do seletor.
            <p
              id="limite-categoria"
              className="w-full rounded-md border border-grouper-sky/40 bg-grouper-mist px-3 py-2 text-grouper-ink"
            >
              {limite.categoria.nome}
            </p>
          ) : (
            <SeletorCategoria
              id="limite-categoria"
              categorias={categorias}
              valor={categoriaId}
              onChange={setCategoriaId}
            />
          )}
        </div>

        {criandoNovaCategoria && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="limite-nova-categoria"
                  className="text-sm font-medium text-grouper-navy"
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
                  className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="limite-nova-categoria-tipo"
                  className="text-sm font-medium text-grouper-navy"
                >
                  Tipo da categoria
                </label>
                <select
                  id="limite-nova-categoria-tipo"
                  value={novaCategoriaTipo}
                  onChange={(e) => setNovaCategoriaTipo(e.target.value as TipoCategoria)}
                  className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
                >
                  <option value="VARIAVEL">Variável</option>
                  <option value="FIXA">Fixa</option>
                </select>
              </div>
            </div>

            <AvisoCategoriaSemelhante
              sugestoes={categoriasSemelhantes}
              onSelecionar={(c) => {
                setCategoriaId(String(c.id));
                setNovaCategoriaNome("");
                setNovaCategoriaTipo("VARIAVEL");
              }}
            />
          </div>
        )}

        <div className="space-y-1">
          <label
            htmlFor="limite-valor"
            className="text-sm font-medium text-grouper-navy"
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
            className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
          />
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
