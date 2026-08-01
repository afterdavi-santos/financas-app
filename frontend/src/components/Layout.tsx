import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

// Layout route: a Sidebar fica fixa à esquerda e o <Outlet/> renderiza
// a página filha da vez (na Parte 1, sempre a HomePage). Ver App.tsx.
export function Layout() {
  return (
    <div className="flex min-h-screen bg-grouper-mist">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
