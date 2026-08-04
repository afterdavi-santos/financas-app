import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

// Modal genérico reaproveitável: recebe título, conteúdo (children) e onClose.
// Fecha ao clicar no X, clicar no backdrop (fundo) ou apertar Esc.
//
// Acessibilidade (WCAG 2.4.3 Focus Order / 2.1.2 No Keyboard Trap / 4.1.2
// Name-Role-Value): como este componente é a base de ~15 modais do app,
// qualquer melhoria aqui se propaga pra todos eles de uma vez.
// - `role="dialog"` + `aria-modal` + `aria-labelledby` dão nome e papel ao
//   diálogo pra leitores de tela.
// - Ao abrir: guarda o elemento que tinha foco, trava o scroll do body e
//   move o foco pro primeiro campo focável do conteúdo (ou pro card, se não
//   houver nenhum). Ao fechar: destrava o scroll e devolve o foco a quem
//   abriu o modal — sem isso, um usuário de teclado "perde o lugar" na
//   página de trás toda vez que fecha um popup.
// - Enquanto aberto, Tab/Shift+Tab ficam presos dentro do modal (focus
//   trap) — impede vazar o foco pro conteúdo coberto pelo backdrop.
interface ModalProps {
  titulo: string;
  aberto: boolean;
  onClose: () => void;
  children: ReactNode;
  // Largura máxima (classe Tailwind). Default estreito; telas com gráfico usam mais.
  largura?: string;
}

// Seletor dos elementos que contam como "focáveis" pro focus trap e pro
// foco inicial — mesmo padrão usado em implementações de dialog acessível.
const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  titulo,
  aberto,
  onClose,
  children,
  largura = "max-w-md",
}: ModalProps) {
  const tituloId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const elementoAnterior = useRef<HTMLElement | null>(null);

  // Esc fecha; Tab/Shift+Tab ciclam só entre os elementos focáveis do modal.
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const focaveis = cardRef.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS);
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, onClose]);

  // Ao abrir: guarda o foco anterior, trava o scroll do body e foca o
  // primeiro campo do modal. Ao fechar (cleanup): desfaz os dois.
  useEffect(() => {
    if (!aberto) return;
    elementoAnterior.current = document.activeElement as HTMLElement | null;
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const primeiro = cardRef.current?.querySelector<HTMLElement>(SELETOR_FOCAVEIS);
    (primeiro ?? cardRef.current)?.focus();
    return () => {
      document.body.style.overflow = overflowOriginal;
      elementoAnterior.current?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    // Backdrop: cobre a tela; clicar nele fecha.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* stopPropagation: clique DENTRO do card não borbulha até o backdrop. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`max-h-[90vh] w-full ${largura} overflow-y-auto rounded-xl bg-white shadow-xl focus:outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-grouper-sky/20 px-6 py-4">
          <h2 id={tituloId} className="font-display text-xl font-semibold text-grouper-ink">
            {titulo}
          </h2>
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
