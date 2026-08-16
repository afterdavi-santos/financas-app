import { useSyncExternalStore } from "react";
import { mesAtualYYYYMM } from "../utils/datas";

// Mês em foco compartilhado por Início/Despesas/Rendas. Antes cada página tinha
// seu próprio useState(mesAtualYYYYMM()), então navegar entre elas jogava o
// seletor de volta pro mês atual e perdia o mês escolhido.
//
// Vive em sessionStorage (não localStorage) de propósito: o mês escolhido
// acompanha a navegação e o F5, mas uma aba nova — ou reabrir o app depois de
// fechar — começa no mês atual, que é o padrão útil no dia a dia.
//
// O store em módulo + useSyncExternalStore é o que mantém instâncias montadas
// ao mesmo tempo em sincronia (as abas Despesas/Rendas de Movimentações): sem
// ele, uma página não saberia que a outra mudou o mês.

const CHAVE = "financas:mesSelecionado";
const FORMATO_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

const ouvintes = new Set<() => void>();

// sessionStorage pode lançar (modo restrito/privacidade em alguns navegadores):
// nesses casos o mês simplesmente não persiste entre recarregamentos, mas
// continua compartilhado entre as páginas enquanto o app estiver aberto.
function lerDoStorage(): string {
  try {
    const salvo = sessionStorage.getItem(CHAVE);
    if (salvo && FORMATO_VALIDO.test(salvo)) return salvo;
  } catch {
    // ignorado de propósito — cai no mês atual
  }
  return mesAtualYYYYMM();
}

let mesAtualDoStore = lerDoStorage();

function inscrever(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  return () => {
    ouvintes.delete(aoMudar);
  };
}

export function definirMesSelecionado(mes: string): void {
  // Guarda contra valor vazio/inválido — um mês em foco quebrado estoura os
  // cálculos de período de todas as telas.
  if (!FORMATO_VALIDO.test(mes) || mes === mesAtualDoStore) return;
  mesAtualDoStore = mes;
  try {
    sessionStorage.setItem(CHAVE, mes);
  } catch {
    // ignorado de propósito — ver lerDoStorage
  }
  ouvintes.forEach((aoMudar) => aoMudar());
}

// Mesma forma de um useState: [valor, setter].
export function useMesSelecionado(): [string, (mes: string) => void] {
  const mes = useSyncExternalStore(inscrever, () => mesAtualDoStore);
  return [mes, definirMesSelecionado];
}
