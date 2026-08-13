import { useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Itens de navegação do menu lateral.
const itens = [
  { rotulo: "Visão geral", para: "/", ativo: true },
  { rotulo: "Movimentações", para: "/movimentacoes", ativo: true },
  { rotulo: "Planejamento", para: "/planejamento", ativo: true },
];

interface SidebarProps {
  // Controla o drawer em telas menores que `md` (ver Layout.tsx). Em telas
  // `md`+ a sidebar fica sempre visível e fixa, independente deste valor —
  // as classes `md:static md:translate-x-0` abaixo cancelam o drawer.
  aberto: boolean;
  onFechar: () => void;
}

export function Sidebar({ aberto, onFechar }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const primeiroLinkRef = useRef<HTMLAnchorElement>(null);

  function sair() {
    logout(); // limpa token do contexto e do localStorage
    navigate("/login");
    onFechar();
  }

  // Esc fecha o drawer mobile (só liga o listener enquanto ele está aberto).
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, onFechar]);

  // Ao abrir o drawer mobile, move o foco pro primeiro link — sem isso um
  // usuário de teclado abriria o menu e o foco continuaria "preso" atrás
  // dele, no botão de hambúrguer que acabou de sumir da tela.
  useEffect(() => {
    if (aberto) primeiroLinkRef.current?.focus();
  }, [aberto]);

  return (
    <>
      {/* Backdrop do drawer — só existe (e é clicável pra fechar) com o
          menu aberto em telas < md; em md+ a sidebar não é mais um drawer. */}
      {aberto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onFechar}
          aria-hidden="true"
        />
      )}
      <aside
        id="menu-lateral"
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col overflow-y-auto bg-grouper-ink text-white transition-transform duration-200 ease-out md:static md:z-auto md:min-h-screen md:translate-x-0 md:transition-none ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-center px-6 py-6 border-b border-white/10">
          <img
            src="/brand/logomarca-branca.svg"
            alt="Logo"
            className="h-16 w-auto shrink-0"
          />
        </div>

        <nav aria-label="Menu principal" className="relative flex-1 overflow-hidden p-3">
          <img
            src="/brand/garoupas_fundo_1.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15"
          />
          <div className="relative z-10 space-y-1">
            {itens.map((item, indice) =>
              item.ativo ? (
                // NavLink aplica classe de "ativo" quando a URL bate com `to`.
                <NavLink
                  key={item.rotulo}
                  ref={indice === 0 ? primeiroLinkRef : undefined}
                  to={item.para}
                  end
                  onClick={onFechar}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 font-body text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-grouper-mid text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  {item.rotulo}
                </NavLink>
              ) : (
                <span
                  key={item.rotulo}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-white/30 cursor-not-allowed"
                >
                  {item.rotulo}
                  <span className="text-[10px] uppercase tracking-wide text-white/20">
                    em breve
                  </span>
                </span>
              ),
            )}
          </div>
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <NavLink
            to="/configuracoes"
            onClick={onFechar}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 font-body text-sm font-medium transition-colors ${
                isActive
                  ? "bg-grouper-mid text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            Configurações
          </NavLink>
          <button
            onClick={sair}
            className="w-full rounded-md px-3 py-1.5 font-body text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white text-left"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
