interface Props {
  marcado: boolean;
  onAlternar: () => void;
}

// Checkbox "Selecionar todos" usado junto com o hook useSelecao em cada lista.
export function SelecionarTodos({ marcado, onAlternar }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={marcado}
        onChange={onAlternar}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      Selecionar todos
    </label>
  );
}
