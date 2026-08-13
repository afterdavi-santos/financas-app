import type { KeyboardEvent } from "react";

// Ativa `acao` no Enter/Espaço — usado nas linhas de lista clicáveis
// (seleção sem checkbox, ex.: Investimento CDB, Objetivos, Rendas) que são
// `<div role="button">` em vez de `<button>` de verdade: o navegador não
// aciona onClick automaticamente com o teclado nesses casos, então precisa
// desse handler explícito pra funcionar sem mouse/toque.
export function aoTeclarAtivar(acao: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      acao();
    }
  };
}
