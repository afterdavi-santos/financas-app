import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

// Uso em App.tsx:
//   <ProtectedRoute><DashboardPage /></ProtectedRoute>
// Se não estiver autenticado, o <Navigate> troca a rota para /login
// (replace: não deixa a página protegida no histórico do navegador).
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
