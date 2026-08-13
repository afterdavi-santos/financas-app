import { useState } from "react";

const TAMANHO_BLOCO = 12;

interface Props {
  anoSelecionado: number;
  onSelecionar: (ano: number) => void;
}

// Grade de anos (blocos de 12, navegáveis) — usada por SeletorMes/SeletorData
// quando o usuário clica no rótulo do ano, pra pular direto pra um ano
// distante (ex.: 2045) sem precisar clicar "próximo ano" dezenas de vezes.
export function GradeAnos({ anoSelecionado, onSelecionar }: Props) {
  // Bloco de 12 anos que contém o ano selecionado, alinhado em múltiplos de
  // 12 (mesmo espírito do seletor de década do Chrome/Google).
  const [anoBase, setAnoBase] = useState(
    () => anoSelecionado - (((anoSelecionado % TAMANHO_BLOCO) + TAMANHO_BLOCO) % TAMANHO_BLOCO),
  );
  const anos = Array.from({ length: TAMANHO_BLOCO }, (_, i) => anoBase + i);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Anos anteriores"
          onClick={() => setAnoBase((a) => a - TAMANHO_BLOCO)}
          className="rounded-md p-1 text-grouper-navy hover:bg-grouper-mist"
        >
          ‹
        </button>
        <span className="font-display text-sm font-semibold text-grouper-ink">
          {anoBase} – {anoBase + TAMANHO_BLOCO - 1}
        </span>
        <button
          type="button"
          aria-label="Próximos anos"
          onClick={() => setAnoBase((a) => a + TAMANHO_BLOCO)}
          className="rounded-md p-1 text-grouper-navy hover:bg-grouper-mist"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {anos.map((ano) => (
          <button
            key={ano}
            type="button"
            onClick={() => onSelecionar(ano)}
            className={`rounded-md px-2 py-1.5 font-body text-sm transition-colors ${
              ano === anoSelecionado
                ? "bg-grouper-mid text-white"
                : "text-grouper-ink hover:bg-grouper-mist"
            }`}
          >
            {ano}
          </button>
        ))}
      </div>
    </div>
  );
}
