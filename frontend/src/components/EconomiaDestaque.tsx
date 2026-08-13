import { formatarBRL } from "../utils/moeda";
import { corEscalaEconomia } from "../utils/cores";
import { useAjustarFonte } from "../hooks/useAjustarFonte";
import { TAMANHO_BASE_REM, TAMANHO_MINIMO_REM } from "./StatCard";

interface EconomiaDestaqueProps {
  valor: number;
  renda: number;
  variacaoPercentual: number | null; // null = sem mês anterior para comparar
}

// Card de destaque da Economia do mês, no lugar do "Total Capital Outlay" da
// referência: número bem maior que o StatCard comum + variação vs mês anterior.
export function EconomiaDestaque({ valor, renda, variacaoPercentual }: EconomiaDestaqueProps) {
  const positivo = valor >= 0;
  const cor = positivo ? "text-grouper-deep" : "text-grouper-ink";
  // Quanto da renda a economia representa (0–100) — quanto mais perto de
  // zero (ou negativa), mais vermelha a borda; ver `corEscalaEconomia`.
  const percentualDaRenda = renda > 0 ? Math.max(0, Math.min(100, (valor / renda) * 100)) : 0;
  const corBorda = corEscalaEconomia(percentualDaRenda);

  const valorFormatado = formatarBRL(valor);
  // Mesmo ajuste dinâmico do StatCard (ver useAjustarFonte.ts): este card
  // vive na coluna direita estreita da Home, e um valor negativo grande
  // (ex.: "-R$ 12.345,67") não cabia em text-3xl fixo.
  const refValor = useAjustarFonte<HTMLParagraphElement>(
    valorFormatado,
    TAMANHO_BASE_REM,
    TAMANHO_MINIMO_REM,
  );

  return (
    <div
      className="rounded-lg border-l-4 bg-white p-5 shadow-sm"
      style={{ borderLeftColor: corBorda }}
    >
      <p className="font-display text-sm font-semibold uppercase tracking-wider text-grouper-ink">
        Economia do mês
      </p>
      <p
        ref={refValor}
        style={{ fontSize: `${TAMANHO_BASE_REM}rem` }}
        className={`mt-2 truncate font-display font-bold ${cor}`}
      >
        {valorFormatado}
      </p>
      {variacaoPercentual !== null && (
        <p className="mt-2 text-sm font-medium text-grouper-navy">
          {variacaoPercentual >= 0 ? "↑" : "↓"} {Math.abs(variacaoPercentual).toFixed(1)}%
          {" "}vs mês anterior
        </p>
      )}
    </div>
  );
}
