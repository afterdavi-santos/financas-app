interface Props {
  quantidade: number;
  // Já concordado em gênero/número por quem chama, ex.: "2 despesas selecionadas".
  texto: string;
  onExcluir: () => void;
  onCancelar: () => void;
}

// Barra de ação que some/aparece conforme o usuário marca itens da lista.
export function BarraSelecao({ quantidade, texto, onExcluir, onCancelar }: Props) {
  if (quantidade === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-md bg-grouper-ink px-4 py-2.5 text-sm text-white">
      <span>{texto}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={onCancelar}
          className="font-medium text-white/60 hover:text-white"
        >
          Cancelar
        </button>
        <button
          onClick={onExcluir}
          className="rounded-md bg-black px-3 py-1.5 font-medium text-white hover:bg-grouper-navy"
        >
          Excluir selecionados
        </button>
      </div>
    </div>
  );
}
