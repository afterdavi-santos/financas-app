// Ícones simples (sem depender de biblioteca externa) para as ações rápidas
// de cada investimento CDB na Home — só aparecem quando o item é selecionado.
interface IconeProps {
  className?: string;
}

export function IconeEditar({ className = "h-4 w-4" }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M13.5 3.5l3 3L6.5 17 3 18l1-3.5L13.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconeExcluir({ className = "h-4 w-4" }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
