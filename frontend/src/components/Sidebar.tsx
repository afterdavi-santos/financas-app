import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Itens de navegação. "Relatórios" (gráficos) ainda fica "em breve".
const itens = [
  { rotulo: "Início", para: "/", ativo: true },
  { rotulo: "Despesas", para: "/despesas", ativo: true },
  { rotulo: "Categorias", para: "/categorias", ativo: true },
  { rotulo: "Rendas", para: "/rendas", ativo: true },
  { rotulo: "Objetivos", para: "/objetivos", ativo: true },
  { rotulo: "Relatórios", para: "#", ativo: false },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function sair() {
    logout(); // limpa token do contexto e do localStorage
    navigate("/login");
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-100 flex flex-col min-h-screen">
      <div className="px-6 py-5 text-lg font-bold border-b border-slate-800">
        Finanças
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
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              {item.rotulo}
            </NavLink>
          ) : (
            <span
              key={item.rotulo}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
              title="Em breve"
            >
              {item.rotulo}
              <span className="text-[10px] uppercase tracking-wide text-slate-600">
                em breve
              </span>
            </span>
          ),
        )}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={sair}
          className="w-full rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 text-left"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
