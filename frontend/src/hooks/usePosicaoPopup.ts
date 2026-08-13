import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// Posiciona um popup renderizado via portal no <body> (position: fixed),
// relativo a um elemento-gatilho — usado por SeletorMes/SeletorData pra
// escapar de containers com overflow:hidden/auto, como o card de Modal.tsx
// (overflow-y-auto), que cortava o calendário quando ele abria perto do
// fim do modal.
// Reajusta pra não vazar da tela: abre pra cima se não couber embaixo do
// gatilho, e desloca pra esquerda se não couber à direita.
export function usePosicaoPopup(aberto: boolean) {
  const gatilhoRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  // Já nasce "position: fixed" (fora do fluxo normal), mesmo antes do
  // useLayoutEffect medir a posição real — sem isso, no primeiríssimo open
  // o popup é medido em fluxo normal, onde um <div> de bloco sem largura
  // fixa se estica pra largura da página inteira, e essa medida errada
  // bagunça o cálculo de "cabe na tela?" (empurra tudo pro canto esquerdo).
  const [estilo, setEstilo] = useState<CSSProperties>({
    position: "fixed",
    top: -9999,
    left: -9999,
  });

  useLayoutEffect(() => {
    if (!aberto || !gatilhoRef.current) return;
    const margem = 8;
    const rectGatilho = gatilhoRef.current.getBoundingClientRect();
    let top = rectGatilho.bottom + margem;
    let left = rectGatilho.left;

    const popup = popupRef.current;
    if (popup) {
      if (top + popup.offsetHeight > window.innerHeight - margem) {
        top = rectGatilho.top - popup.offsetHeight - margem;
      }
      if (left + popup.offsetWidth > window.innerWidth - margem) {
        left = window.innerWidth - popup.offsetWidth - margem;
      }
      if (left < margem) left = margem;
    }

    setEstilo({ position: "fixed", top, left, minWidth: rectGatilho.width });
  }, [aberto]);

  // Junta os dois refs (clique fora precisa considerar gatilho E popup,
  // já que o popup não está mais dentro do gatilho no DOM depois do portal).
  function clicouDentro(alvo: Node): boolean {
    return !!gatilhoRef.current?.contains(alvo) || !!popupRef.current?.contains(alvo);
  }

  return { gatilhoRef, popupRef, estilo, clicouDentro };
}
