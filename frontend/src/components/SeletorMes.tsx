import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { mesAtualYYYYMM } from "../utils/datas";
import { usePosicaoPopup } from "../hooks/usePosicaoPopup";
import { GradeAnos } from "./GradeAnos";

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

interface Props {
  // Formato "YYYY-MM", igual ao <input type="month"> que este componente substitui.
  value: string;
  onChange: (mes: string) => void;
  // "cabecalho" (padrão): botão "cara de botão" cheio, usado nos filtros de
  // mês (Início/Movimentações) — largura fixa a partir de lg.
  // "formulario": campo fino igual aos outros inputs de modal (ex.: mês da
  // renda em NovaRendaModal), largura total em qualquer breakpoint.
  variant?: "cabecalho" | "formulario";
  // Repassado ao <button> — permite associar um <label htmlFor="...">.
  id?: string;
}

// Largura do wrapper (posiciona o popup) — cada variante define a sua aqui,
// e o botão/popup dentro usam sempre "w-full" desse wrapper.
const ESTILO_RAIZ = {
  cabecalho: "relative w-full lg:w-44",
  formulario: "relative w-full",
};

const ESTILO_BOTAO = {
  cabecalho:
    "flex w-full min-w-0 items-center justify-between gap-1 rounded-md border-2 border-grouper-mid bg-white px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-grouper-ink shadow-sm transition-colors hover:bg-grouper-mist focus:outline-none focus:ring-2 focus:ring-grouper-mid",
  formulario:
    "flex w-full min-w-0 items-center justify-between gap-1 rounded-md border border-grouper-sky/40 bg-white px-3 py-2 text-grouper-ink transition-colors hover:bg-grouper-mist focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50",
};

// Substitui o <input type="month"> nativo nos cabeçalhos (Início/Movimentações)
// e nos formulários (ex.: mês da renda): o calendário nativo do navegador é
// desenhado fora do nosso controle (às vezes cola na borda da tela no mobile
// — não dá pra estilizar/reposicionar via CSS). Este popup é HTML/CSS nosso,
// renderizado via portal no <body> (ver usePosicaoPopup) — assim ele nunca
// vaza da tela nem fica cortado pelo overflow:auto do card de Modal.tsx.
export function SeletorMes({ value, onChange, variant = "cabecalho", id }: Props) {
  const [aberto, setAberto] = useState(false);
  // Fallback defensivo pra hoje se o valor chegar vazio (ver mesmo guard em
  // SeletorData.tsx).
  const [ano, mesNum] = (value || mesAtualYYYYMM()).split("-").map(Number);
  // Ano em navegação dentro do popup — só aplica ao selecionar um mês.
  const [anoNavegado, setAnoNavegado] = useState(ano);
  // Grade de anos (ver GradeAnos.tsx) — aberta ao clicar no rótulo do ano,
  // pra pular direto pra um ano distante em vez de clicar "próximo ano" um
  // por um.
  const [modoAno, setModoAno] = useState(false);
  const { gatilhoRef, popupRef, estilo, clicouDentro } = usePosicaoPopup(aberto);

  useEffect(() => {
    if (aberto) {
      setAnoNavegado(ano);
      setModoAno(false);
    }
  }, [aberto, ano]);

  // Fecha ao clicar fora ou apertar Esc — mesmo padrão do Avatar.tsx/Modal.tsx.
  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (!clicouDentro(e.target as Node)) setAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, clicouDentro]);

  function selecionarMes(mesEscolhido: number) {
    const mesFormatado = String(mesEscolhido + 1).padStart(2, "0");
    onChange(`${anoNavegado}-${mesFormatado}`);
    setAberto(false);
  }

  return (
    <div ref={gatilhoRef} className={ESTILO_RAIZ[variant]}>
      <button
        id={id}
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className={ESTILO_BOTAO[variant]}
      >
        {/* Mês abreviado em 3 letras (mesmos rótulos da grade do popup), a
            pedido do usuário. O truncate fica como guarda: o botão tem
            largura fixa (lg:w-44) e o texto não pode quebrar linha nem
            estourar com o ícone ao lado. */}
        <span className="min-w-0 truncate">
          {MESES_ABREV[mesNum - 1]} de {ano}
        </span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
          <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm10 6H4v8h12V8Z" />
        </svg>
      </button>

      {aberto &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label="Selecionar mês"
            style={estilo}
            // w-60 (não min-w): precisa ser uma largura FIXA, não só mínima
            // — no primeiro cálculo de posição (usePosicaoPopup) o popup
            // ainda é medido antes de "position: fixed" ser aplicado, e sem
            // largura fixa um <div> de bloco solto no <body> ocupa a página
            // inteira nesse instante, fazendo a conta de "cabe na tela?"
            // dar errado (empurrava o popup pro canto esquerdo no 1º clique).
            className="z-50 w-60 rounded-md border-2 border-grouper-ink bg-white p-3 shadow-lg"
          >
            {modoAno ? (
              <GradeAnos
                anoSelecionado={anoNavegado}
                onSelecionar={(anoEscolhido) => {
                  setAnoNavegado(anoEscolhido);
                  setModoAno(false);
                }}
              />
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Ano anterior"
                    onClick={() => setAnoNavegado((a) => a - 1)}
                    className="rounded-md p-1 text-grouper-navy hover:bg-grouper-mist"
                  >
                    ‹
                  </button>
                  {/* Clicável — abre a grade de anos (GradeAnos.tsx) pra
                      pular direto pra um ano distante (ex.: 2045) sem
                      precisar clicar "próximo ano" dezenas de vezes. */}
                  <button
                    type="button"
                    onClick={() => setModoAno(true)}
                    className="rounded-md px-2 font-display text-sm font-semibold text-grouper-ink hover:bg-grouper-mist"
                  >
                    {anoNavegado}
                  </button>
                  <button
                    type="button"
                    aria-label="Próximo ano"
                    onClick={() => setAnoNavegado((a) => a + 1)}
                    className="rounded-md p-1 text-grouper-navy hover:bg-grouper-mist"
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {MESES_ABREV.map((rotulo, indice) => {
                    const selecionado = anoNavegado === ano && indice === mesNum - 1;
                    return (
                      <button
                        key={rotulo}
                        type="button"
                        onClick={() => selecionarMes(indice)}
                        className={`rounded-md px-2 py-1.5 font-body text-sm capitalize transition-colors ${
                          selecionado
                            ? "bg-grouper-mid text-white"
                            : "text-grouper-ink hover:bg-grouper-mist"
                        }`}
                      >
                        {rotulo}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onChange(mesAtualYYYYMM());
                    setAberto(false);
                  }}
                  className="mt-2 w-full rounded-md py-1 text-left font-body text-sm text-grouper-deep hover:bg-grouper-mist"
                >
                  Este mês
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
