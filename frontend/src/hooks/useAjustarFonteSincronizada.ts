import { useLayoutEffect, useRef } from "react";

// Como useAjustarFonte.ts, mas coordena o tamanho entre vários elementos ao
// mesmo tempo: cada um calcula o tamanho que caberia sozinho, e todos usam
// o MENOR desses tamanhos — evita que cards vizinhos (ex.: "Despesas fixas"
// e "Despesas variáveis") mostrem o valor em tamanhos de fonte diferentes
// só porque um número é mais comprido que o outro.
export function useAjustarFonteSincronizada(
  dependencias: unknown[],
  tamanhoBaseRem: number,
  tamanhoMinimoRem: number,
) {
  const refs = useRef<(HTMLElement | null)[]>([]);

  useLayoutEffect(() => {
    const elementos = refs.current.filter((el): el is HTMLElement => el !== null);
    if (elementos.length === 0) return;

    function tamanhoIdeal(el: HTMLElement): number {
      let atual = tamanhoBaseRem;
      el.style.fontSize = `${atual}rem`;
      while (el.scrollWidth > el.clientWidth && atual > tamanhoMinimoRem) {
        atual = Math.max(tamanhoMinimoRem, atual - 0.125);
        el.style.fontSize = `${atual}rem`;
      }
      return atual;
    }

    function ajustar() {
      const menor = Math.min(...elementos.map(tamanhoIdeal));
      elementos.forEach((el) => {
        el.style.fontSize = `${menor}rem`;
      });
    }

    ajustar();
    // Reajusta em resize da janela/rotação do celular — não só na
    // montagem. Escuta "resize" da window (sinal externo), não um
    // ResizeObserver nos próprios elementos: como `ajustar` muta o
    // font-size de cada um (e o de UM elemento pode não ser o tamanho
    // final sincronizado, já que primeiro medimos o ideal individual pra
    // só depois aplicar o menor a todos), um ResizeObserver neles se
    // autodispara a cada ajuste — gera um loop e o resultado final fica
    // preso num valor intermediário errado.
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  // Uma função de ref por índice (index fixo por card, estável entre
  // renders) — cada StatCard recebe a sua via valorRef.
  return function refDoIndice(indice: number) {
    return (el: HTMLElement | null) => {
      refs.current[indice] = el;
    };
  };
}
