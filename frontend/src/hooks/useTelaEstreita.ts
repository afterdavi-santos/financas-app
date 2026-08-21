import { useEffect, useState } from "react";

// true enquanto a viewport for menor que o breakpoint `sm` do Tailwind (640px).
//
// Existe porque placeholder de <input> é CONTEÚDO, não estilo: não dá pra
// encurtar com uma classe responsiva como o resto do layout. Para qualquer
// coisa que seja estilo, prefira `sm:` no className em vez deste hook — CSS
// não precisa de re-render.
const CONSULTA = "(max-width: 639px)";

export function useTelaEstreita(): boolean {
  const [estreita, setEstreita] = useState(() => window.matchMedia(CONSULTA).matches);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA);
    const aoMudar = (evento: MediaQueryListEvent) => setEstreita(evento.matches);
    // Sincroniza uma vez no mount: entre o useState inicial e este efeito a
    // janela pode ter sido redimensionada (ou o componente montado depois de
    // uma mudança de orientação).
    setEstreita(consulta.matches);
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  return estreita;
}
