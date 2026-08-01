import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Itens de navegação do menu lateral.
const itens = [
  { rotulo: "Início", para: "/", ativo: true },
  { rotulo: "Movimentações", para: "/movimentacoes", ativo: true },
  { rotulo: "Categorias", para: "/categorias", ativo: true },
  { rotulo: "Objetivos", para: "/objetivos", ativo: true },
  { rotulo: "Limites", para: "/limites", ativo: true },
  { rotulo: "Relatórios", para: "/relatorios", ativo: true },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function sair() {
    logout(); // limpa token do contexto e do localStorage
    navigate("/login");
  }

  return (
    <aside className="w-60 shrink-0 bg-grouper-ink text-white flex flex-col min-h-screen">
      <div className="flex items-center px-6 py-6 border-b border-white/10">
        <img
          src="/brand/logomarca-branca.svg"
          alt="Logo"
          className="h-16 w-auto shrink-0"
        />
      </div>

      <nav className="flex-1 p-3 space-y-1">
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
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={sair}
          className="w-full rounded-md px-3 py-2 font-body text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white text-left"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
