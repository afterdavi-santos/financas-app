import { useMemo, useState } from "react";
import type { Categoria } from "../types/financas";

// Valor especial que sinaliza "abrir o formulário de nova categoria inline" —
// compartilhado entre todos os lugares que usam este seletor (antes duplicado
// como constante local em cada modal).
export const OPCAO_NOVA_CATEGORIA = "__nova__";

// Lista SEMPRE aberta (não é um dropdown que abre/fecha) com busca por texto
// no topo e rolagem pra ver além das mais usadas — bate com o pedido de
// "só 4 categorias + nova categoria visíveis, resto por scroll".
interface Props {
  id: string;
  categorias: Categoria[];
  valor: string; // "" | OPCAO_NOVA_CATEGORIA | String(categoriaId)
  onChange: (valor: string) => void;
  permitirNovaCategoria?: boolean;
  desabilitado?: boolean;
}

const QTD_MAIS_USADAS = 4;

export function SeletorCategoria({
  id,
  categorias,
  valor,
  onChange,
  permitirNovaCategoria = true,
  desabilitado = false,
}: Props) {
  const [busca, setBusca] = useState("");

  const ordenadas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo) {
      return categorias.filter((c) => c.nome.toLowerCase().includes(termo));
    }
    // Sem busca: as 4 mais usadas primeiro (empate por nome), depois o
    // resto — mesma lista, só que exige rolar pra ver além das 4 primeiras.
    const maisUsadas = [...categorias]
      .sort((a, b) => b.totalDespesas - a.totalDespesas || a.nome.localeCompare(b.nome))
      .slice(0, QTD_MAIS_USADAS);
    const idsMaisUsadas = new Set(maisUsadas.map((c) => c.id));
    const resto = categorias
      .filter((c) => !idsMaisUsadas.has(c.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    return [...maisUsadas, ...resto];
  }, [categorias, busca]);

  const categoriaSelecionada = categorias.find((c) => String(c.id) === valor);

  return (
    <div className={desabilitado ? "pointer-events-none opacity-60" : ""}>
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        disabled={desabilitado}
        placeholder={categoriaSelecionada ? categoriaSelecionada.nome : "Buscar categoria..."}
        aria-label="Buscar categoria"
        className="w-full rounded-t-md border border-b-0 border-grouper-sky/40 px-3 py-2 text-sm text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
      />
      <div
        id={id}
        role="listbox"
        className="max-h-48 overflow-y-auto rounded-b-md border border-grouper-sky/40"
      >
        {permitirNovaCategoria && (
          <button
            type="button"
            role="option"
            aria-selected={valor === OPCAO_NOVA_CATEGORIA}
            onClick={() => onChange(OPCAO_NOVA_CATEGORIA)}
            className={`block w-full border-b border-grouper-sky/20 px-3 py-2 text-left text-sm font-medium ${
              valor === OPCAO_NOVA_CATEGORIA
                ? "bg-grouper-sky/30 text-grouper-ink"
                : "text-grouper-deep hover:bg-grouper-mist"
            }`}
          >
            + Nova categoria...
          </button>
        )}
        {ordenadas.length === 0 ? (
          <p className="px-3 py-2 text-sm text-grouper-navy/60">Nenhuma categoria encontrada.</p>
        ) : (
          ordenadas.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={String(c.id) === valor}
              onClick={() => onChange(String(c.id))}
              className={`block w-full border-b border-grouper-sky/10 px-3 py-2 text-left text-sm last:border-b-0 ${
                String(c.id) === valor
                  ? "bg-grouper-sky/30 text-grouper-ink"
                  : "text-grouper-ink hover:bg-grouper-mist"
              }`}
            >
              {c.nome}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
