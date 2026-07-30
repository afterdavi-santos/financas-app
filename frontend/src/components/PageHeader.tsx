import type { ReactNode } from "react";

// Cabeçalho padrão das páginas do menu: título à esquerda, ações à direita.
interface Props {
  titulo: string;
  children?: ReactNode; // botões de ação (ex.: "+ Adicionar")
}

export function PageHeader({ titulo, children }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-slate-800">{titulo}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
