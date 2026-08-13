import type { Categoria } from "../types/financas";

// Aviso NÃO-bloqueante mostrado ao digitar o nome de uma categoria nova,
// quando já existe uma parecida (busca por similaridade no backend). Sem
// `onSelecionar`, é só informativo (ex.: NovaCategoriaModal, que não tem
// "onde selecionar" a sugestão); com `onSelecionar`, cada sugestão vira um
// botão que troca a categoria-nova pela existente.
interface Props {
  sugestoes: Categoria[];
  onSelecionar?: (categoria: Categoria) => void;
}

export function AvisoCategoriaSemelhante({ sugestoes, onSelecionar }: Props) {
  if (sugestoes.length === 0) return null;

  return (
    <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p>
        {sugestoes.length === 1 ? "Categoria parecida já existe: " : "Categorias parecidas já existem: "}
        {sugestoes.slice(0, 2).map((s, i) => (
          <span key={s.id}>
            {i > 0 && ", "}
            <strong>{s.nome}</strong>
          </span>
        ))}
        .
      </p>
      {onSelecionar ? (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {sugestoes.slice(0, 2).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelecionar(s)}
              className="rounded-md border border-amber-400 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Usar "{s.nome}"
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-0.5 text-xs text-amber-700">
          Você pode criar categorias com o mesmo nome, desde que sejam de tipos diferentes.
        </p>
      )}
    </div>
  );
}
