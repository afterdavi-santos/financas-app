import { useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "./Modal";

// Popup de confirmação genérico — substitui o confirm() nativo do navegador
// nos ~13 lugares do app que só perguntavam "Excluir X?"/"Remover X?" antes de
// agir (a cor do confirm() nativo é controlada pelo SO, e ele bloqueia a
// thread, então não dá pra mostrar um estado de "excluindo..."). Reaproveita
// o `Modal.tsx` genérico, então já sai com a borda azul-marinho padrão de
// todo popup do app (`classeCard` default do `Modal`).
//
// Casos que precisam de MAIS do que uma pergunta simples (ex.: excluir
// categoria em uso, com escalada para digitar "EXCLUIR") continuam com popup
// próprio (`ExcluirCategoriaModal.tsx`, `ExcluirInvestimentoModal.tsx`) — este
// componente é só para o caso comum "confirmar e executar uma ação".
interface Props {
  // null = fechado. Guardar o item (não um booleano) no estado do caller
  // evita um segundo state para "qual item estou excluindo".
  aberto: boolean;
  titulo: string;
  mensagem: ReactNode;
  textoConfirmar?: string;
  // Cor do botão de ação: vermelho para exclusão (default), azul para ações
  // não-destrutivas mas ainda irreversíveis (ex.: remover um aporte).
  variante?: "perigo" | "neutro";
  onConfirmar: () => Promise<void> | void;
  onClose: () => void;
}

const CLASSE_BOTAO = {
  perigo: "bg-red-600 hover:bg-red-700",
  neutro: "bg-grouper-mid hover:bg-grouper-deep",
};

export function ConfirmacaoModal({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = "Excluir",
  variante = "perigo",
  onConfirmar,
  onClose,
}: Props) {
  const [carregando, setCarregando] = useState(false);

  async function confirmar() {
    setCarregando(true);
    try {
      await onConfirmar();
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal titulo={titulo} aberto={aberto} onClose={onClose}>
      <div className="space-y-4">
        {/* whitespace-pre-line: deixa uma mensagem em texto puro usar "
"
            pra separar parágrafos (ex.: o aviso de renda fixa) sem virar
            JSX. Não muda nada nas mensagens de uma linha só. */}
        <div className="whitespace-pre-line text-sm text-grouper-navy">{mensagem}</div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={carregando}
            className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={carregando}
            className={`rounded-md px-4 py-2 font-display text-sm font-semibold text-white disabled:opacity-60 ${CLASSE_BOTAO[variante]}`}
          >
            {carregando ? `${textoConfirmar}...` : textoConfirmar}
          </button>
        </div>
      </div>
    </Modal>
  );
}
