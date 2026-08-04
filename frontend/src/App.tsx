import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomePage } from "./pages/HomePage";
import { MovimentacoesPage } from "./pages/MovimentacoesPage";
import { PlanejamentoPage } from "./pages/PlanejamentoPage";

// AuthProvider por fora: todo o app enxerga o estado de autenticação.
// BrowserRouter: liga as URLs do navegador às páginas abaixo.
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registrar" element={<RegisterPage />} />

          {/* Protegidas: só entram autenticadas (ProtectedRoute -> Outlet).
              Dentro, o Layout desenha a sidebar e renderiza a página no Outlet. */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} /> {/* "/" */}
              <Route path="movimentacoes" element={<MovimentacoesPage />} />
              <Route path="planejamento" element={<PlanejamentoPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
