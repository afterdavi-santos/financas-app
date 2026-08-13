import { useLayoutEffect, useRef } from "react";

// Encolhe o font-size do elemento (em passos de 0.125rem) até o texto caber
// na largura disponível, sem cortar/truncar — usado em valores que podem
// crescer sem previsão certa de quantos dígitos vão caber (ex.: R$ com mais
// casas decimais/milhares num card estreito no mobile). Diferente de um
// breakpoint fixo (`sm:text-3xl`), reage ao espaço real disponível: só
// encolhe o quanto precisar, em qualquer largura de tela.
export function useAjustarFonte<T extends HTMLElement>(
  dependencia: unknown,
  tamanhoBaseRem: number,
  tamanhoMinimoRem: number,
) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    function ajustar() {
      if (!el) return;
      let atual = tamanhoBaseRem;
      el.style.fontSize = `${atual}rem`;
      while (el.scrollWidth > el.clientWidth && atual > tamanhoMinimoRem) {
        atual = Math.max(tamanhoMinimoRem, atual - 0.125);
        el.style.fontSize = `${atual}rem`;
      }
    }

    ajustar();
    // Reajusta em resize da janela/rotação do celular — não só na
    // montagem. Escuta "resize" da window (sinal externo), não um
    // ResizeObserver no próprio elemento: como `ajustar` já muta o
    // font-size (logo o próprio tamanho do elemento), um ResizeObserver
    // nele se autodispara a cada ajuste, criando um loop.
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [dependencia, tamanhoBaseRem, tamanhoMinimoRem]);

  return ref;
}
