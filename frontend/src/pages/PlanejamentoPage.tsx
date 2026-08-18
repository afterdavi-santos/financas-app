import { useState } from "react";
import { PlanejamentoObjetivos } from "../components/PlanejamentoObjetivos";
import { PlanejamentoCategorias } from "../components/PlanejamentoCategorias";
import { PlanejamentoLimites } from "../components/PlanejamentoLimites";
import { Avatar } from "../components/Avatar";
import { SeletorMes } from "../components/SeletorMes";
import { useMesSelecionado } from "../hooks/useMesSelecionado";

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
  // Nó onde os 3 blocos portam seus botões "+ Novo X", pra aparecerem juntos
  // na linha do título — mesmo mecanismo (`headerSlot` via portal) usado em
  // Movimentações.
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);
  // Mês em foco, compartilhado com Início/Despesas/Rendas (ver
  // useMesSelecionado): chegar aqui vindo de Despesas mantém o mês escolhido
  // lá, em vez de pular de volta pro atual. Governa a renda usada no plano
  // dos Objetivos e o mês de referência dos Limites; Categorias não depende
  // de mês (a lista é a mesma o ano inteiro).
  const [mes, selecionarMes] = useMesSelecionado();

  return (
    <div className="flex w-full flex-col gap-4 lg:h-[calc(100vh-4rem)]">
      {/* Título + botões (portados por Objetivos/Limites/Categorias) + avatar
          numa linha só, mesmo padrão do cabeçalho da Home — empilha em
          largura total abaixo de `lg`. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="order-1 font-display text-3xl font-semibold tracking-tight text-grouper-ink lg:order-none">
          Planejamento
        </h1>
        {/* No mobile, o avatar (order-2) fica ao lado do título (order-1) e
            os controles portados (order-3) empilham abaixo — mesma técnica
            `contents`/`order` usada na Home. */}
        <div className="contents lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
          <div className="order-3 w-full lg:order-none lg:w-auto">
            <SeletorMes value={mes} onChange={selecionarMes} />
          </div>
          <div
            ref={setHeaderSlot}
            className="order-3 flex w-full flex-col gap-2 lg:order-none lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-2"
          />
          <div className="order-2 lg:order-none lg:contents">
            <Avatar menu />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid min-h-0 gap-4 lg:grid-rows-2 lg:col-span-2">
          <PlanejamentoObjetivos headerSlot={headerSlot} mes={mes} />
          <PlanejamentoLimites headerSlot={headerSlot} mes={mes} />
        </div>
        <PlanejamentoCategorias headerSlot={headerSlot} />
      </div>
    </div>
  );
}
