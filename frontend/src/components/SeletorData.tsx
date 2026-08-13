import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { dataBR } from "../utils/rotulos";
import { hojeISO } from "../utils/datas";
import { usePosicaoPopup } from "../hooks/usePosicaoPopup";
import { GradeAnos } from "./GradeAnos";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatarISO(ano: number, mes: number, dia: number): string {
  return `${ano}-${pad2(mes)}-${pad2(dia)}`;
}

interface Props {
  // Formato "YYYY-MM-DD", igual ao <input type="date"> que este componente substitui.
  value: string;
  onChange: (data: string) => void;
  // Datas fora desse intervalo (também "YYYY-MM-DD") ficam desabilitadas no
  // popup — mesmo papel dos atributos nativos min/max.
  min?: string;
  max?: string;
  id?: string;
  // Classes do botão-gatilho — pensado pra reaproveitar exatamente a classe
  // que cada formulário já usava no <input type="date"> antigo, então a
  // troca não muda a aparência, só a interação (calendário nosso, não o
  // nativo do navegador, que não dá pra estilizar nem controlar o tamanho).
  className: string;
}

// Substitui o <input type="date"> nativo (usado em vários modais: Nova
// despesa, Aportar, Novo objetivo, Novo investimento CDB, etc.) pelo mesmo
// motivo do SeletorMes.tsx: o calendário nativo do navegador não dá pra
// estilizar nem reposicionar via CSS, e às vezes vaza da borda da tela no
// mobile. Renderizado via portal no <body> (ver usePosicaoPopup) — assim
// não fica cortado pelo overflow-y-auto do card de Modal.tsx.
export function SeletorData({ value, onChange, min, max, id, className }: Props) {
  const [aberto, setAberto] = useState(false);
  // Fallback pra hoje quando o valor ainda não chegou (ex.: no primeiro
  // render de um modal que só preenche o state real num useEffect, depois
  // desse render) — sem isso, "" vira NaN e o cálculo do grid do calendário
  // (new Array(NaN)) derruba o componente inteiro.
  const [ano, mes] = (value || hojeISO()).split("-").map(Number);
  // Mês/ano em navegação dentro do popup — só aplica ao selecionar um dia.
  const [anoNavegado, setAnoNavegado] = useState(ano);
  const [mesNavegado, setMesNavegado] = useState(mes);
  // Grade de anos (ver GradeAnos.tsx) — aberta ao clicar no rótulo do
  // mês/ano, pra pular direto pra um ano distante (ex.: 2045) sem precisar
  // clicar "próximo mês" centenas de vezes.
  const [modoAno, setModoAno] = useState(false);
  const { gatilhoRef, popupRef, estilo, clicouDentro } = usePosicaoPopup(aberto);

  useEffect(() => {
    if (aberto) {
      setAnoNavegado(ano);
      setMesNavegado(mes);
      setModoAno(false);
    }
  }, [aberto, ano, mes]);

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

  function mudarMesNavegado(delta: number) {
    const d = new Date(anoNavegado, mesNavegado - 1 + delta, 1);
    setAnoNavegado(d.getFullYear());
    setMesNavegado(d.getMonth() + 1);
  }

  function selecionarDia(diaEscolhido: number) {
    onChange(formatarISO(anoNavegado, mesNavegado, diaEscolhido));
    setAberto(false);
  }

  const primeiroDiaSemana = new Date(anoNavegado, mesNavegado - 1, 1).getDay();
  const diasNoMes = new Date(anoNavegado, mesNavegado, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  return (
    <div ref={gatilhoRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className={`inline-flex items-center justify-between gap-1 ${className}`}
      >
        <span>{dataBR(value)}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
          <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm10 6H4v8h12V8Z" />
        </svg>
      </button>

      {aberto &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label="Selecionar data"
            style={estilo}
            className="z-50 w-64 rounded-md border-2 border-grouper-ink bg-white p-3 shadow-lg"
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
                    aria-label="Mês anterior"
                    onClick={() => mudarMesNavegado(-1)}
                    className="rounded-md p-1 text-grouper-navy hover:bg-grouper-mist"
                  >
                    ‹
                  </button>
                  {/* Clicável — abre a grade de anos (GradeAnos.tsx) pra
                      pular direto pra um ano distante (ex.: 2045) sem
                      precisar clicar "próximo mês" centenas de vezes. */}
                  <button
                    type="button"
                    onClick={() => setModoAno(true)}
                    className="rounded-md px-2 font-display text-sm font-semibold capitalize text-grouper-ink hover:bg-grouper-mist"
                  >
                    {new Date(anoNavegado, mesNavegado - 1, 1).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </button>
                  <button
                    type="button"
                    aria-label="Próximo mês"
                    onClick={() => mudarMesNavegado(1)}
                    className="rounded-md p-1 text-grouper-navy hover:bg-grouper-mist"
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {DIAS_SEMANA.map((rotulo, indice) => (
                    <span
                      // eslint-disable-next-line react/no-array-index-key
                      key={indice}
                      className="text-xs font-medium text-grouper-navy/60"
                    >
                      {rotulo}
                    </span>
                  ))}
                  {celulas.map((diaCelula, indice) => {
                    if (diaCelula === null) {
                      // eslint-disable-next-line react/no-array-index-key
                      return <span key={`vazio-${indice}`} />;
                    }
                    const iso = formatarISO(anoNavegado, mesNavegado, diaCelula);
                    const selecionado = iso === value;
                    const foraDoIntervalo = (min && iso < min) || (max && iso > max);
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={!!foraDoIntervalo}
                        onClick={() => selecionarDia(diaCelula)}
                        className={`rounded-md py-1 text-sm transition-colors ${
                          selecionado
                            ? "bg-grouper-mid text-white"
                            : foraDoIntervalo
                              ? "cursor-not-allowed text-grouper-navy/30"
                              : "text-grouper-ink hover:bg-grouper-mist"
                        }`}
                      >
                        {diaCelula}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const hoje = hojeISO();
                    if ((min && hoje < min) || (max && hoje > max)) return;
                    onChange(hoje);
                    setAberto(false);
                  }}
                  className="mt-2 w-full rounded-md py-1 text-left font-body text-sm text-grouper-deep hover:bg-grouper-mist"
                >
                  Hoje
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
