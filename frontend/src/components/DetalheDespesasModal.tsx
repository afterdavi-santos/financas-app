import { Modal } from "./Modal";
import { formatarBRL } from "../utils/moeda";
import { dataBR } from "../utils/rotulos";
import { totalPorCategoria } from "../utils/despesasResumo";
import type { Despesa } from "../types/financas";

// Popup de detalhamento reutilizado nos 3 cliques da tela de Despesas
// (total fixas, total extraordinárias, categoria do Top 5). Recebe uma lista
// de despesas já filtrada e as agrupa por categoria, com subtotal em cada grupo.
interface Props {
  titulo: string;
  aberto: boolean;
  onClose: () => void;
  despesas: Despesa[];
}

export function DetalheDespesasModal({
  titulo,
  aberto,
  onClose,
  despesas,
}: Props) {
  // Ordem dos grupos = categorias com maior gasto primeiro.
  const grupos = totalPorCategoria(despesas);

  return (
    <Modal titulo={titulo} aberto={aberto} onClose={onClose}>
      {despesas.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma despesa.</p>
      ) : (
        <div className="max-h-96 space-y-4 overflow-y-auto">
          {grupos.map((grupo) => (
            <div key={grupo.nome}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <span className="text-sm font-semibold text-slate-700">
                  {grupo.nome}
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {formatarBRL(grupo.total)}
                </span>
              </div>
              <ul className="mt-1">
                {despesas
                  .filter((d) => d.categoria.nome === grupo.nome)
                  .sort((a, b) => b.data.localeCompare(a.data))
                  .map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between py-1 text-sm"
                    >
                      <span className="text-slate-600">
                        {d.descricao}{" "}
                        <span className="text-xs text-slate-400">
                          · {dataBR(d.data)}
                        </span>
                      </span>
                      <span className="text-slate-800">
                        {formatarBRL(d.valor)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
