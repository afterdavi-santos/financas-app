import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Placeholder: só existe para validar que a rota protegida e o logout funcionam.
// Nos próximos marcos, vira o dashboard real (gráficos, resumo do mês, etc.).
export function DashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function sair() {
    logout(); // limpa token do contexto e do localStorage
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-100 p-4">
      <div className="bg-white rounded-xl shadow-md p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">
          Você está autenticado! 🎉
        </h1>
        <p className="text-slate-600">
          Esta é uma rota protegida. O dashboard real virá nos próximos passos.
        </p>
        <button
          onClick={sair}
          className="bg-slate-800 text-white font-medium rounded-md px-4 py-2 hover:bg-slate-900"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
