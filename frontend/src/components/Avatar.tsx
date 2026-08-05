import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePerfil } from "../context/PerfilContext";

// Extrai iniciais (até 2 letras) do nome do usuário, ex: "Davi Souza" -> "DS".
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

const TAMANHOS = {
  sm: { caixa: "h-10 w-10", texto: "text-sm" },
  lg: { caixa: "h-20 w-20", texto: "text-2xl" },
};

interface Props {
  // "sm" = tamanho padrão do cabeçalho (Home, Movimentações). "lg" = usado
  // no cartão de identidade da própria página de Configurações.
  tamanho?: "sm" | "lg";
  // Quando true, clicar no avatar abre um menu com "Editar perfil" (usado
  // nos cabeçalhos da Home/Movimentações). A própria ConfiguracoesPage passa
  // false (padrão) pra não linkar pra si mesma.
  menu?: boolean;
}

// Avatar compartilhado: mostra a foto do usuário se houver (data URI vinda de
// PerfilContext), senão as iniciais do nome, senão o placeholder vazio de
// sempre (perfil ainda não carregou).
export function Avatar({ tamanho = "sm", menu = false }: Props) {
  const { perfil } = usePerfil();
  const { caixa, texto } = TAMANHOS[tamanho];
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fecha o menu ao clicar fora ou apertar Esc — mesmo padrão do Modal.tsx.
  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  const conteudo = perfil?.fotoBase64 ? (
    <img
      src={perfil.fotoBase64}
      alt="Foto de perfil"
      className={`${caixa} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <div
      className={`flex ${caixa} shrink-0 items-center justify-center rounded-full bg-grouper-ink font-display ${texto} font-semibold text-white`}
    >
      {perfil?.nome ? (
        <span aria-hidden="true">{iniciais(perfil.nome)}</span>
      ) : null}
      <span className="sr-only">Perfil do usuário</span>
    </div>
  );

  if (!menu) {
    return conteudo;
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Menu do perfil"
        className="block rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-grouper-mid focus-visible:ring-offset-2"
      >
        {conteudo}
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-40 rounded-md border border-grouper-sky/40 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false);
              navigate("/configuracoes");
            }}
            className="block w-full px-3 py-2 text-left font-body text-sm text-grouper-ink hover:bg-grouper-mist"
          >
            Editar perfil
          </button>
        </div>
      )}
    </div>
  );
}
