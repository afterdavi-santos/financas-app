import { useState } from "react";
import { formatarBRL } from "../utils/moeda";
import { planoObjetivo } from "../utils/objetivos";
import { corEscalaProgresso } from "../utils/cores";
import { dataBR } from "../utils/rotulos";
import { NovoObjetivoModal } from "./NovoObjetivoModal";
import type { Objetivo } from "../types/financas";

interface ObjetivosResumoHomeProps {
  objetivos: Objetivo[];
  rendaFixaMensal: number;
  // Chamado após criar um objetivo pelo modal desta seção, para a Home
  // recarregar a lista (o estado dos objetivos vive na HomePage).
  onObjetivoCriado: () => void;
}

// Guarda localmente (só nesta máquina/navegador) quais objetivos o usuário
// fixou para sempre aparecerem no topo da Home — é só uma preferência de
// exibição, não faz sentido virar campo no backend.
const CHAVE_FIXADOS = "financas.objetivosFixadosHome";
const MAX_FIXADOS = 2;

function lerFixados(): Set<number> {
  try {
    const bruto = localStorage.getItem(CHAVE_FIXADOS);
    return new Set(bruto ? (JSON.parse(bruto) as number[]) : []);
  } catch {
    return new Set();
  }
}

function IconeFixar({ preenchido }: { preenchido: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M10 3l1.8 4.2L16 8l-3 3 .7 4.3L10 13.3 6.3 15.3 7 11 4 8l4.2-.8L10 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={preenchido ? "currentColor" : "none"}
      />
    </svg>
  );
}

// Resumo condensado de objetivos para a Home, no lugar do "Strategic
// Objectives" da referência: descrição + barra de progresso por objetivo,
// sem os botões de gestão completos (esses ficam só na página Objetivos).
export function ObjetivosResumoHome({
  objetivos,
  rendaFixaMensal,
  onObjetivoCriado,
}: ObjetivosResumoHomeProps) {
  const [fixados, setFixados] = useState<Set<number>>(lerFixados);
  const [modalAberto, setModalAberto] = useState(false);

  function alternarFixado(id: number) {
    setFixados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        if (proximo.size >= MAX_FIXADOS) return atual; // já tem os 2 permitidos
        proximo.add(id);
      }
      localStorage.setItem(CHAVE_FIXADOS, JSON.stringify([...proximo]));
      return proximo;
    });
  }

  // Fixados primeiro (mantendo a ordem original entre si e entre os demais).
  const objetivosOrdenados = [...objetivos].sort(
    (a, b) => Number(fixados.has(b.id)) - Number(fixados.has(a.id)),
  );

  return (
    <section className="rounded-lg border border-grouper-sky/20 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-grouper-ink">
          Objetivos
        </h2>
        <button
          onClick={() => setModalAberto(true)}
          className="rounded-md bg-grouper-deep px-3 py-1.5 text-sm text-white hover:bg-grouper-ink"
        >
          + Adicionar objetivo
        </button>
      </div>
      {objetivos.length === 0 ? (
        <p className="text-sm text-grouper-navy/60">
          Nenhum objetivo cadastrado.
        </p>
      ) : (
        <ul
          className={`divide-y divide-grouper-sky/15 ${
            objetivos.length > 2 ? "max-h-64 overflow-y-auto pr-1" : ""
          }`}
        >
          {objetivosOrdenados.map((obj) => {
            const plano = planoObjetivo(obj, rendaFixaMensal);
            const fixado = fixados.has(obj.id);
            return (
              <li key={obj.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-grouper-ink">{obj.descricao}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-grouper-deep">
                      {plano.progresso.toFixed(0)}%
                    </span>
                    <button
                      onClick={() => alternarFixado(obj.id)}
                      aria-label={fixado ? "Desafixar objetivo" : "Fixar objetivo"}
                      title={
                        fixado
                          ? "Desafixar objetivo"
                          : fixados.size >= MAX_FIXADOS
                            ? `Você já fixou ${MAX_FIXADOS} objetivos`
                            : "Fixar objetivo na Home"
                      }
                      className={`transition-colors ${
                        fixado
                          ? "text-grouper-mid"
                          : "text-grouper-navy/30 hover:text-grouper-navy/60"
                      }`}
                    >
                      <IconeFixar preenchido={fixado} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-grouper-mist">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${plano.progresso}%`,
                      backgroundColor: corEscalaProgresso(plano.progresso),
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-grouper-navy/60">
                  <span>
                    {formatarBRL(obj.valorAtual)} de {formatarBRL(obj.valorAlvo)}
                  </span>
                  <span>meta para {dataBR(obj.dataAlvo)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NovoObjetivoModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        onCriada={() => {
          setModalAberto(false);
          onObjetivoCriado();
        }}
      />
    </section>
  );
}
