import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { buscarPerfil } from "../api/perfil";
import type { PerfilResponse } from "../types/perfil";

// Diferente do AuthContext (que só guarda o token, sem chamada HTTP), este
// contexto guarda dado de domínio buscado da API — pode ficar desatualizado
// e precisa de recarregar() depois de salvar mudanças em Configurações.
interface PerfilContextType {
  perfil: PerfilResponse | null;
  carregando: boolean;
  recarregar: () => Promise<void>;
}

const PerfilContext = createContext<PerfilContextType | undefined>(undefined);

// Só existe dentro de rotas protegidas (ver Layout.tsx) — busca o perfil uma
// vez ao montar, e expõe recarregar() para quem editar os dados (e o Avatar,
// usado em várias páginas) sempre lerem a mesma cópia em memória.
export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilResponse | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const dados = await buscarPerfil();
    setPerfil(dados);
  }, []);

  useEffect(() => {
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  const valor: PerfilContextType = { perfil, carregando, recarregar };

  return (
    <PerfilContext.Provider value={valor}>{children}</PerfilContext.Provider>
  );
}

export function usePerfil(): PerfilContextType {
  const contexto = useContext(PerfilContext);
  if (contexto === undefined) {
    throw new Error("usePerfil precisa estar dentro de um <PerfilProvider>");
  }
  return contexto;
}
