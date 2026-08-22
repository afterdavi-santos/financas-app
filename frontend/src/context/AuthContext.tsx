import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { TOKEN_KEY, limparCacheDeLeitura } from "../api/client";
import { tokenExpirado } from "../utils/jwt";

// O que fica disponível globalmente para qualquer componente do app.
interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// Contexto criado sem valor default: só faz sentido dentro do <AuthProvider>.
// O hook useAuth (lá embaixo) garante esse uso correto.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Componente que "abraça" o app inteiro (ver App.tsx) e fornece o estado de auth.
export function AuthProvider({ children }: { children: ReactNode }) {
  // Estado inicializado a partir do localStorage:
  // se o usuário já logou antes, o token sobrevive a um reload da página.
  // MAS se o token já expirou (ex.: voltou depois de 24h sem usar o app —
  // sessão é de janela deslizante, renovada a cada requisição enquanto ativa,
  // ver api/client.ts), descartamos na hora — assim o usuário cai no /login
  // em vez de entrar numa sessão morta.
  const [token, setToken] = useState<string | null>(() => {
    const salvo = localStorage.getItem(TOKEN_KEY);
    if (tokenExpirado(salvo)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return salvo;
  });

  // As duas funções limpam o cache de leitura da API (api/client.ts). Não é
  // detalhe de performance: o cache é indexado por URL, não por usuário — sem
  // limpar, entrar numa conta logo depois de sair de outra mostraria por até 30
  // segundos as despesas da conta anterior.
  function login(novoToken: string) {
    limparCacheDeLeitura();
    localStorage.setItem(TOKEN_KEY, novoToken); // persiste no navegador
    setToken(novoToken); // atualiza a UI (re-renderiza quem depende disso)
  }

  function logout() {
    limparCacheDeLeitura();
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  const valor: AuthContextType = {
    token,
    isAuthenticated: token !== null,
    login,
    logout,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// Hook para consumir o contexto de forma segura em qualquer componente:
//   const { isAuthenticated, login } = useAuth();
// Lança erro claro se alguém esquecer de envolver o app no <AuthProvider>.
export function useAuth(): AuthContextType {
  const contexto = useContext(AuthContext);
  if (contexto === undefined) {
    throw new Error("useAuth precisa estar dentro de um <AuthProvider>");
  }
  return contexto;
}
