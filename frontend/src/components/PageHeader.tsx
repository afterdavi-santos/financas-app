import type { ReactNode } from "react";

// Cabeçalho padrão das páginas do menu: título à esquerda, ações à direita.
interface Props {
  titulo?: string; // omitido quando o título já aparece em outro lugar (ex.: aba ativa)
  children?: ReactNode; // botões de ação (ex.: "+ Adicionar")
}

export function PageHeader({ titulo, children }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {titulo && (
        <h1 className="font-display text-2xl font-bold text-grouper-ink mr-auto">
          {titulo}
        </h1>
      )}
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
