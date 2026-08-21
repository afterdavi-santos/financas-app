import { useState } from "react";
import { DespesasPage } from "./DespesasPage";
import { RendasPage } from "./RendasPage";
import { Avatar } from "../components/Avatar";

type Aba = "despesas" | "rendas";

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "despesas", rotulo: "Despesas" },
  { chave: "rendas", rotulo: "Rendas" },
];

export function MovimentacoesPage() {
  const [aba, setAba] = useState<Aba>("despesas");
  // Nó onde Despesas/Rendas portam seus controles de cabeçalho (mês +
  // adicionar), pra aparecerem na mesma linha horizontal das abas.
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);
  // Nó onde Despesas/Rendas portam seus respectivos gráficos mensais, pra
  // aparecerem na coluna direita (antes vazia).
  const [graficoSlot, setGraficoSlot] = useState<HTMLDivElement | null>(null);

  return (
    // No mobile isto vira um único `flex-wrap`: título, avatar, abas,
    // botões, conteúdo e gráfico ficam todos no mesmo contexto, pra dar
    // pra reordenar livremente via `order` (as abas precisam aparecer
    // ACIMA dos botões no mobile, mas os botões ficam na linha do título
    // no desktop — os dois wrappers abaixo (`contents lg:flex`/`lg:grid`)
    // "evaporam" no mobile exatamente pra permitir isso). No desktop volta
    // a ser um empilhamento simples de 2 blocos (linha do título, grid).
    // `justify-between` é o que joga o avatar (order-2) pro canto direito
    // no mobile, longe do título (order-1) — sem ele os dois ficam colados
    // à esquerda. Mesmo cabeçalho da Home e do Planejamento. No desktop
    // isto vira `block` e as regras de flex não valem mais.
    <div className="flex w-full flex-wrap items-center justify-between gap-3 lg:block lg:space-y-2">
      {/* Título + botões (portados por DespesasPage/RendasPage) + avatar —
          no desktop formam uma linha só; no mobile "evapora" (contents) e
          cada filho vira um item solto do flex-wrap acima, reordenável. */}
      <div className="contents lg:flex lg:items-center lg:justify-between lg:gap-3">
        <h1 className="order-1 font-display text-3xl font-semibold tracking-tight text-grouper-ink lg:order-none">
          Movimentações
        </h1>
        {/* Botões (headerSlot) + avatar agrupados num único wrapper —
            precisam ficar colados entre si, então não podem ser dois
            filhos soltos do `justify-between` de cima (senão o espaço
            "sobra" entre eles em vez de ficar só entre o título e o
            grupo). Mesma estrutura usada na Home. */}
        <div className="contents lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
          <div
            ref={setHeaderSlot}
            className="order-4 flex w-full flex-col gap-2 lg:order-none lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-3"
          />
          <div className="order-2 lg:order-none">
            <Avatar menu />
          </div>
        </div>
      </div>

      {/* Abas + conteúdo + gráfico — no desktop é o grid de 3 colunas de
          sempre; no mobile "evapora" também, pras abas (order-3) poderem
          ficar entre o avatar (order-2) e os botões (order-4) acima. */}
      <div className="contents lg:grid lg:grid-cols-3 lg:gap-4">
        <div className="order-3 flex w-full gap-6 border-b border-grouper-sky/20 lg:order-none lg:col-span-3">
          {ABAS.map((item) => (
            <button
              key={item.chave}
              onClick={() => setAba(item.chave)}
              className={`-mb-px border-b-2 px-1 pb-3 font-display text-sm font-semibold transition-colors ${
                aba === item.chave
                  ? "border-grouper-mid text-grouper-mid"
                  : "border-transparent text-grouper-navy/50 hover:text-grouper-navy"
              }`}
            >
              {item.rotulo}
            </button>
          ))}
        </div>

        {/* col-span-2: mesma largura da coluna esquerda da Home, pra os cards
            (Despesas fixas/variáveis, Renda fixa/variável) ficarem
            do mesmo tamanho dos StatCards de Renda/Despesas do mês de lá. */}
        <div className="order-5 w-full space-y-6 lg:order-none lg:col-span-2">
          {aba === "despesas" ? (
            <DespesasPage headerSlot={headerSlot} graficoSlot={graficoSlot} />
          ) : (
            <RendasPage headerSlot={headerSlot} graficoSlot={graficoSlot} />
          )}
        </div>

        {/* Coluna direita (antes vazia): recebe via portal o gráfico mensal
            da aba ativa (despesas ou variação de renda). */}
        <div ref={setGraficoSlot} className="order-6 w-full lg:order-none" />
      </div>
    </div>
  );
}
