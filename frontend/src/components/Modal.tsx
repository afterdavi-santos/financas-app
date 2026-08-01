import { useEffect } from "react";
import type { ReactNode } from "react";

// Modal genérico reaproveitável: recebe título, conteúdo (children) e onClose.
// Fecha ao clicar no X, clicar no backdrop (fundo) ou apertar Esc.
interface ModalProps {
  titulo: string;
  aberto: boolean;
  onClose: () => void;
  children: ReactNode;
  // Largura máxima (classe Tailwind). Default estreito; telas com gráfico usam mais.
  largura?: string;
}

export function Modal({
  titulo,
  aberto,
  onClose,
  children,
  largura = "max-w-md",
}: ModalProps) {
  // useEffect: liga um "efeito colateral" ao ciclo de vida do componente.
  // Aqui: enquanto o modal está aberto, ouvimos a tecla Esc no documento.
  // O return é a "limpeza" (remove o listener quando fecha/desmonta).
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, onClose]);

  if (!aberto) return null;

  return (
    // Backdrop: cobre a tela; clicar nele fecha.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* stopPropagation: clique DENTRO do card não borbulha até o backdrop. */}
      <div
        className={`max-h-[90vh] w-full ${largura} overflow-y-auto rounded-xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-grouper-sky/20 px-6 py-4">
          <h2 className="font-display text-xl font-semibold text-grouper-ink">{titulo}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-xl leading-none text-grouper-navy/50 hover:text-grouper-ink"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
