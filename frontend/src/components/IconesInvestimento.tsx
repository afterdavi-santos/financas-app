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

export function IconeInfo({ className = "h-4 w-4" }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="10"
        y1="9.25"
        x2="10"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="6.3" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function IconeGrafico({ className = "h-4 w-4" }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M3 17V3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 17h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="5.5" y="11" width="2.6" height="6" rx="0.6" fill="currentColor" />
      <rect x="10.2" y="7" width="2.6" height="10" rx="0.6" fill="currentColor" />
      <rect x="14.9" y="9.5" width="2.6" height="7.5" rx="0.6" fill="currentColor" />
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

// Lupa da busca por nome na lista "Todas as despesas do mês"
// (DespesasPage). Mesmo traço dos demais: viewBox 20x20, stroke currentColor.
export function IconeLupa({ className = "h-4 w-4" }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="8.75" cy="8.75" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="12.75"
        y1="12.75"
        x2="16.5"
        y2="16.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
