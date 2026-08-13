import { useRef } from "react";
import type { ReactNode } from "react";

// Tooltip próprio do app — substitui o atributo `title` nativo do navegador
// nos botões/ícones (Editar, Excluir, etc.). O tooltip nativo tem sua cor
// controlada pelo SO/tema do navegador (não dá pra estilizar via CSS); este
// componente é 100% nosso, fundo branco + texto escuro sempre, em qualquer
// navegador. Só CSS/Tailwind, sem lib nova (mesmo espírito do resto do app).
//
// `group/tooltip` é um grupo NOMEADO (Tailwind), isolado de qualquer outro
// `group` sem nome já usado por aí (ex.: o hover do avatar em
// ConfiguracoesPage) — não colide.
//
// `posicao`: sem medir a tela via JS (o componente é só CSS), o balão
// centralizado por padrão ("centro") vaza pra fora quando o gatilho está
// perto da borda direita de um container com scroll (`overflow-y-auto`
// também clipa o eixo X, ver a11y-e-responsividade.md) — ex.: os ícones de
// Editar/Excluir, sempre os últimos elementos de uma linha. Nesses casos use
// "direita": o balão cresce só pra ESQUERDA, com a borda direita alinhada ao
// gatilho, nunca ultrapassando o lado direito dele.
//
// `vertical`: por padrão o balão abre pra CIMA ("cima") — mesmo problema de
// vazamento, mas no eixo Y: no primeiro item de uma lista com rolagem
// própria, não há espaço acima do gatilho dentro do container clipado, então
// o balão fica cortado. Nesses casos use "baixo".
interface Props {
  texto: string;
  children: ReactNode;
  posicao?: "centro" | "direita";
  vertical?: "cima" | "baixo";
}

const CLASSE_POSICAO = {
  centro: "left-1/2 -translate-x-1/2",
  direita: "right-0",
};

const CLASSE_VERTICAL = {
  cima: "bottom-full mb-1.5",
  baixo: "top-full mt-1.5",
};

export function Tooltip({ texto, children, posicao = "centro", vertical = "cima" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  // O botão ganha foco ao ser clicado (não só via Tab), e o tooltip usa
  // `focus-within` pra continuar visível durante navegação por teclado —
  // sem isso, um clique de mouse prendia o tooltip na tela até outro clique
  // tirar o foco. Ao sair com o mouse, se o foco ainda estiver aqui dentro
  // (ou seja, veio de clique, não de Tab — nesse caso o mouse nunca "sai"
  // no meio da navegação), tira o foco pra esconder o tooltip.
  function aoSairComMouse() {
    if (ref.current?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
  }

  return (
    <span ref={ref} className="group/tooltip relative inline-flex" onMouseLeave={aoSairComMouse}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-white px-2 py-1 text-xs font-medium text-grouper-ink opacity-0 shadow-md ring-1 ring-grouper-sky/40 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${CLASSE_POSICAO[posicao]} ${CLASSE_VERTICAL[vertical]}`}
      >
        {texto}
      </span>
    </span>
  );
}
