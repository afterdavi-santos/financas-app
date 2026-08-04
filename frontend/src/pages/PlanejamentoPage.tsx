import { PlanejamentoObjetivos } from "../components/PlanejamentoObjetivos";
import { PlanejamentoCategorias } from "../components/PlanejamentoCategorias";
import { PlanejamentoLimites } from "../components/PlanejamentoLimites";

// Página "Planejamento": junta Objetivos, Categorias e Limites (antes 3 itens
// de menu separados) numa única view, sem abas — diferente de Movimentações,
// aqui cabem todos os blocos ao mesmo tempo porque nenhum tem tanta
// informação sozinho. Em telas `lg`+ (grid de 3 colunas), cada bloco tem
// altura fixa (a da tela, descontado título + padding do Layout) com
// rolagem interna própria, para a página inteira caber sem precisar rolar.
// Layout: Objetivos (em cima) + Limites (embaixo) dividindo os 2/3
// esquerdos; Categorias sozinha no 1/3 direito.
//
// Abaixo de `lg` os blocos empilham em 1 coluna — nesse caso a altura fixa
// é removida (só existe a partir de `lg:`) e os blocos voltam a ter altura
// natural (baseada no conteúdo), com a página inteira rolando normalmente,
// em vez de tentar espremer 3 blocos empilhados na altura pensada pra um
// grid de 3 colunas lado a lado.
export function PlanejamentoPage() {
  return (
    <div className="flex w-full flex-col gap-4 lg:h-[calc(100vh-4rem)]">
      <h1 className="shrink-0 font-display text-3xl font-semibold tracking-tight text-grouper-ink">
        Planejamento
      </h1>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid min-h-0 gap-4 lg:grid-rows-2 lg:col-span-2">
          <PlanejamentoObjetivos />
          <PlanejamentoLimites />
        </div>
        <PlanejamentoCategorias />
      </div>
    </div>
  );
}
