import { useEffect, useRef, useState } from "react";
import { buscarCategoriasSemelhantes } from "../api/categorias";
import type { Categoria } from "../types/financas";

const DEBOUNCE_MS = 400;
const MIN_CARACTERES = 2;

// Sugere categorias já existentes com nome parecido ao que está sendo
// digitado (pra evitar duplicata tipo "Mercado" vs "Mercadinho"). Debounced;
// se o nome bate EXATO (case-insensitive) com uma categoria já carregada,
// nem chama a API — já sabemos a resposta localmente.
//
// `idIgnorado` é a categoria que está sendo EDITADA: sem ele, abrir a edição
// de "Mercado" acusava "Categoria parecida já existe: Mercado" — a própria,
// devolvida pela busca do backend. Filtrar a lista local não bastava, porque
// quem traz a sugestão nesse caso é a API, não a lista.
export function useCategoriasSemelhantes(
  nome: string,
  categoriasExistentes: Categoria[],
  idIgnorado?: number,
) {
  const [sugestoes, setSugestoes] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(false);
  const requisicaoAtual = useRef(0);

  useEffect(() => {
    const nomeAparado = nome.trim();

    if (nomeAparado.length < MIN_CARACTERES) {
      setSugestoes([]);
      setCarregando(false);
      return;
    }

    const exata = categoriasExistentes.find(
      (c) => c.nome.trim().toLowerCase() === nomeAparado.toLowerCase(),
    );
    if (exata) {
      setSugestoes([exata]);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    const idRequisicao = ++requisicaoAtual.current;
    const timeout = setTimeout(() => {
      buscarCategoriasSemelhantes(nomeAparado)
        .then((resultado) => {
          if (idRequisicao === requisicaoAtual.current) {
            setSugestoes(resultado.filter((c) => c.id !== idIgnorado));
          }
        })
        .catch(() => {
          if (idRequisicao === requisicaoAtual.current) {
            setSugestoes([]);
          }
        })
        .finally(() => {
          if (idRequisicao === requisicaoAtual.current) {
            setCarregando(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [nome, categoriasExistentes, idIgnorado]);

  return { sugestoes, carregando };
}
