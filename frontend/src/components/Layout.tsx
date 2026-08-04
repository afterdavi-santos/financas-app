import { useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

// Layout route: a Sidebar fica fixa à esquerda em telas `md`+ e vira um
// drawer off-canvas (acionado pela barra superior mobile) em telas menores
// — ver Sidebar.tsx. O <Outlet/> renderiza a página filha da vez.
export function Layout() {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const botaoMenuRef = useRef<HTMLButtonElement>(null);

  // Devolve o foco pro botão de hambúrguer ao fechar o drawer (Esc,
  // backdrop ou clicar num link) — sem isso um usuário de teclado "perde o
  // lugar" na barra superior.
  function fecharMenuMobile() {
    setMenuMobileAberto(false);
    botaoMenuRef.current?.focus();
  }

  return (
    <div className="flex min-h-screen bg-grouper-mist">
      {/* Pular para o conteúdo: invisível até ganhar foco por teclado (Tab) —
          evita que quem navega sem mouse precise passar pelo menu inteiro
          toda vez que troca de página. */}
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-grouper-ink focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>

      {/* Barra superior só em telas menores que md — nelas a Sidebar vira
          drawer (ver Sidebar.tsx) e essa barra é o gatilho pra abri-lo. */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-grouper-ink px-4 text-white md:hidden">
        <img src="/brand/logomarca-branca.svg" alt="Logo" className="h-8 w-auto" />
        <button
          ref={botaoMenuRef}
          onClick={() => setMenuMobileAberto(true)}
          aria-label="Abrir menu"
          aria-controls="menu-lateral"
          aria-expanded={menuMobileAberto}
          className="rounded-md p-2 hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <Sidebar aberto={menuMobileAberto} onFechar={fecharMenuMobile} />

      {/* `inert` desativa foco/clique no conteúdo principal enquanto o
          drawer mobile está aberto por cima dele — sem isso, dar Tab a
          partir do último link do menu vazaria pro conteúdo escondido
          atrás do backdrop. Suportado nativamente desde React 19. */}
      <main
        id="conteudo-principal"
        inert={menuMobileAberto || undefined}
        className="flex-1 p-6 pt-20 md:p-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
