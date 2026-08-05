import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Itens de navegação do menu lateral.
const itens = [
  { rotulo: "Início", para: "/", ativo: true },
  { rotulo: "Movimentações", para: "/movimentacoes", ativo: true },
  { rotulo: "Planejamento", para: "/planejamento", ativo: true },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function sair() {
    logout(); // limpa token do contexto e do localStorage
    navigate("/login");
  }

  return (
    <aside className="w-60 shrink-0 sticky top-0 h-screen bg-grouper-ink text-white flex flex-col">
      <div className="flex items-center justify-center px-6 py-6 border-b border-white/10">
        <img
          src="/brand/logomarca-branca.svg"
          alt="Logo"
          className="h-16 w-auto shrink-0"
        />
      </div>

      <nav className="relative flex-1 overflow-hidden p-3">
        <img
          src="/brand/47e601e3-b81f-4cf0-a040-e5b103c84221.jpeg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15"
        />
        <div className="relative z-10 space-y-1">
          {itens.map((item) =>
            item.ativo ? (
              // NavLink aplica classe de "ativo" quando a URL bate com `to`.
              <NavLink
                key={item.rotulo}
                to={item.para}
                end
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
                title="Em breve"
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
  );
}
