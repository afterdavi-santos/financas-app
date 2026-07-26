import { useState } from "react";

// Controla um conjunto de ids selecionados (checkboxes de uma lista).
// Set em vez de array: has()/toggle() são O(1) e não duplicam id.
export function useSelecao() {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  function alternar(id: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  }

  function limpar() {
    setSelecionados(new Set());
  }

  // Adiciona os ids ao conjunto já selecionado (não substitui) — permite ter
  // um "selecionar todos" por seção sem apagar a seleção de outras seções.
  function selecionarTodos(ids: number[]) {
    setSelecionados((atual) => new Set([...atual, ...ids]));
  }

  // Remove só os ids passados do conjunto selecionado (contraparte do de cima).
  function desselecionarTodos(ids: number[]) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      ids.forEach((id) => novo.delete(id));
      return novo;
    });
  }

  function todosSelecionados(ids: number[]) {
    return ids.length > 0 && ids.every((id) => selecionados.has(id));
  }

  return {
    selecionados,
    alternar,
    limpar,
    selecionarTodos,
    desselecionarTodos,
    todosSelecionados,
  };
}
