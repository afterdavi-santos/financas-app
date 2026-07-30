import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Agora é uma "guarda de layout": usada como rota-pai em App.tsx.
// Se autenticado, o <Outlet/> deixa as rotas filhas renderizarem;
// senão, redireciona para /login (replace: não empilha no histórico).
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
