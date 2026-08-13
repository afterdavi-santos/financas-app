import { formatarBRL } from "../utils/moeda";
import { useAjustarFonte } from "../hooks/useAjustarFonte";

// text-3xl / text-lg do Tailwind, em rem — usados como base/piso do ajuste
// dinâmico de fonte (ver useAjustarFonte.ts). Exportados pra quem sincroniza
// o tamanho entre cards vizinhos usar os mesmos valores (ver
// useAjustarFonteSincronizada.ts e DespesasPage/RendasPage).
export const TAMANHO_BASE_REM = 1.875;
export const TAMANHO_MINIMO_REM = 1.125;

// Card de "macro" do mês (Renda, Despesas, Economia). Reutilizado na home.
// `destaque` controla a cor do valor: mid-blue = positivo, ink = negativo,
// navy = neutro — a paleta do brandbook não tem verde/vermelho, então o
// significado financeiro é dado por peso/profundidade da cor, não pelo matiz.
// `onClick` (opcional) torna o card clicável (vira <button>) — usado na tela
// de Despesas para abrir o detalhamento. Sem onClick, é um card estático igual antes.
interface StatCardProps {
  titulo: string;
  valor: number;
  destaque?: "positivo" | "negativo" | "neutro";
  onClick?: () => void;
  // Quando informado, o StatCard não ajusta mais o tamanho da fonte do
  // valor sozinho — um componente pai (ex.: DespesasPage, sincronizando
  // "Despesas fixas"/"Despesas variáveis" via useAjustarFonteSincronizada)
  // assume o controle, pra cards vizinhos usarem o mesmo tamanho de fonte.
  valorRef?: (el: HTMLParagraphElement | null) => void;
}

export function StatCard({
  titulo,
  valor,
  destaque = "neutro",
  onClick,
  valorRef,
}: StatCardProps) {
  const cor =
    destaque === "positivo"
      ? "text-grouper-deep"
      : destaque === "negativo"
        ? "text-grouper-ink"
        : "text-grouper-ink";

  const acento =
    destaque === "positivo"
      ? "border-grouper-green"
      : destaque === "negativo"
        ? "border-grouper-red"
        : "border-grouper-sky";

  const valorFormatado = formatarBRL(valor);
  // Encolhe a fonte do valor até caber na largura do card, em vez de um
  // breakpoint fixo — este card divide um grid-cols-2 fixo (sem breakpoint,
  // ver DespesasPage/RendasPage) com o card ao lado, e valores maiores (mais
  // casas/milhares) podem não caber em text-3xl mesmo em telas maiores.
  // Só usado quando `valorRef` não é passado (ver comentário na prop acima).
  const refInterno = useAjustarFonte<HTMLParagraphElement>(
    valorFormatado,
    TAMANHO_BASE_REM,
    TAMANHO_MINIMO_REM,
  );

  const conteudo = (
    <>
      {/* text-xs no mobile, text-sm a partir de sm: evita quebra de linha
          em títulos maiores (ex.: "Despesas variáveis") na largura estreita
          do grid-cols-2 fixo (ver DespesasPage/RendasPage). */}
      <p className="font-display text-xs font-semibold uppercase tracking-wider text-grouper-ink sm:text-sm">
        {titulo}
      </p>
      <p
        ref={valorRef ?? refInterno}
        style={{ fontSize: `${TAMANHO_BASE_REM}rem` }}
        // truncate como rede de segurança: se mesmo no tamanho mínimo o
        // valor não couber (caso extremo), corta em vez de vazar do card.
        className={`mt-2 truncate font-display font-bold ${cor}`}
      >
        {valorFormatado}
      </p>
    </>
  );

  // Com onClick vira um botão (acessível, foco por teclado) com feedback de hover.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-lg border-l-4 ${acento} bg-white p-5 text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-grouper-mid/50`}
      >
        {conteudo}
        <p className="mt-2 text-xs font-medium text-grouper-mid">Ver detalhes →</p>
      </button>
    );
  }

  return (
    <div className={`rounded-lg border-l-4 ${acento} bg-white p-5 shadow-sm`}>
      {conteudo}
    </div>
  );
}
