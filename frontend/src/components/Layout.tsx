import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { PerfilProvider } from "../context/PerfilContext";

// Layout route: a Sidebar fica fixa à esquerda e o <Outlet/> renderiza
// a página filha da vez. Ver App.tsx. PerfilProvider fica aqui (não no
// AuthProvider) porque só existe para rotas protegidas/autenticadas.
export function Layout() {
  return (
    <PerfilProvider>
      <div className="flex min-h-screen bg-grouper-mist">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </PerfilProvider>
  );
}
