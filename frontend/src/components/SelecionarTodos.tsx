interface Props {
  marcado: boolean;
  onAlternar: () => void;
}

// Checkbox "Selecionar todos" usado junto com o hook useSelecao em cada lista.
export function SelecionarTodos({ marcado, onAlternar }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm text-grouper-navy/70">
      <input
        type="checkbox"
        checked={marcado}
        onChange={onAlternar}
        className="h-4 w-4 rounded border-grouper-sky text-grouper-mid focus:ring-grouper-mid"
      />
      Selecionar todos
    </label>
  );
}
