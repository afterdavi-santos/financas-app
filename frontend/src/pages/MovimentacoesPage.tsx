import { useState } from "react";
import { DespesasPage } from "./DespesasPage";
import { RendasPage } from "./RendasPage";

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
    <div className="w-full space-y-2">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-grouper-ink">
        Movimentações
      </h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Linha das abas + controles ocupa a largura toda da página (3
            colunas), pra empurrar os controles e o avatar até a borda
            direita, com as abas ficando à esquerda como antes. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grouper-sky/20 lg:col-span-3">
          <div className="flex gap-6">
            {ABAS.map((item) => (
              <button
                key={item.chave}
                onClick={() => setAba(item.chave)}
                className={`-mb-px border-b-2 px-1 pb-3 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                  aba === item.chave
                    ? "border-grouper-mid text-grouper-mid"
                    : "border-transparent text-grouper-navy/50 hover:text-grouper-navy"
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pb-3">
            <div ref={setHeaderSlot} className="flex flex-wrap items-center gap-2" />
            {/* Placeholder do avatar do usuário — mesmo padrão da Home. */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grouper-ink font-display text-sm font-semibold text-white">
              <span className="sr-only">Perfil do usuário</span>
            </div>
          </div>
        </div>

        {/* col-span-2: mesma largura da coluna esquerda da Home, pra os cards
            (Despesas fixas/variáveis, Renda fixa/variável) ficarem
            do mesmo tamanho dos StatCards de Renda/Despesas do mês de lá. */}
        <div className="space-y-6 lg:col-span-2">
          {aba === "despesas" ? (
            <DespesasPage headerSlot={headerSlot} graficoSlot={graficoSlot} />
          ) : (
            <RendasPage headerSlot={headerSlot} graficoSlot={graficoSlot} />
          )}
        </div>

        {/* Coluna direita (antes vazia): recebe via portal o gráfico mensal
            da aba ativa (despesas ou variação de renda). */}
        <div ref={setGraficoSlot} />
      </div>
    </div>
  );
}
