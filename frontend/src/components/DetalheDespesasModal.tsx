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
        <p className="text-sm text-grouper-navy/60">Nenhuma despesa.</p>
      ) : (
        <div className="max-h-96 space-y-4 overflow-y-auto">
          {grupos.map((grupo) => (
            <div key={grupo.nome}>
              <div className="flex items-center justify-between border-b border-grouper-sky/20 pb-1">
                <span className="text-sm font-semibold text-grouper-ink">
                  {grupo.nome}
                </span>
                <span className="text-sm font-semibold text-grouper-ink">
                  {formatarBRL(grupo.total)}
                </span>
              </div>
              {(() => {
                const despesasCategoria = despesas
                  .filter((d) => d.categoria.nome === grupo.nome)
                  .sort((a, b) => b.data.localeCompare(a.data));
                return (
                  <ul
                    className={`mt-1 ${
                      despesasCategoria.length > 7
                        ? "max-h-52 overflow-y-auto pr-1"
                        : ""
                    }`}
                  >
                    {despesasCategoria.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between py-1 text-sm"
                      >
                        <span className="text-grouper-navy">
                          {d.descricao}{" "}
                          <span className="text-xs text-grouper-navy/50">
                            · {dataBR(d.data)}
                          </span>
                        </span>
                        <span className="text-grouper-ink">
                          {formatarBRL(d.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
