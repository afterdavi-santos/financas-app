import { useEffect, useMemo, useState } from "react";
import { NovoLimiteModal } from "./NovoLimiteModal";
import { BarraSelecao } from "./BarraSelecao";
import { SelecionarTodos } from "./SelecionarTodos";
import { IconeEditar, IconeExcluir } from "./IconesInvestimento";
import { useSelecao } from "../hooks/useSelecao";
import { listarCategorias } from "../api/categorias";
import { listarLimites, statusLimite, excluirLimite } from "../api/limites";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { primeiroDiaDoMesISO } from "../utils/datas";
import type { Categoria, LimiteCategoria, StatusLimite } from "../types/financas";

interface Linha {
  limite: LimiteCategoria;
  status: StatusLimite;
}

// Cor da barra conforme o quanto do teto já foi consumido — âmbar de atenção
// (mesma cor não-brandbook usada em "Ponto de atenção" das Despesas, mantida
// de propósito para diferenciar de alarme real) e vermelho/verde do brandbook.
function corDaBarra(estourado: boolean, proporcao: number): string {
  if (estourado) return "bg-grouper-red";
  if (proporcao >= 0.8) return "bg-amber-500";
  return "bg-grouper-green";
}

// Bloco "Limites" da página Planejamento — mesmo conteúdo que antes vivia em
// /limites, agora encaixado numa coluna do grid de 3 blocos, com rolagem
// interna própria (ver PlanejamentoPage) em vez de rolar a página.
export function PlanejamentoLimites() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<LimiteCategoria | null>(null);
  const {
    selecionados,
    alternar,
    limpar,
    selecionarTodos,
    desselecionarTodos,
    todosSelecionados,
  } = useSelecao();

  function abrirNovo() {
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(limite: LimiteCategoria) {
    setEditando(limite);
    setModalAberto(true);
  }

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const mesReferencia = primeiroDiaDoMesISO();
      const [cats, limites] = await Promise.all([
        listarCategorias(),
        listarLimites(),
      ]);
      const comStatus = await Promise.all(
        limites.map(async (limite) => ({
          limite,
          status: await statusLimite(limite.categoria.id, mesReferencia),
        })),
      );
      setCategorias(cats);
      setLinhas(comStatus);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  // useMemo: sem isso, um novo array a cada render reinicia o efeito de
  // useCategoriasSemelhantes (dentro do NovoLimiteModal) indefinidamente
  // (loop infinito de render).
  const categoriasSemLimite = useMemo(() => {
    const comLimite = new Set(linhas.map((l) => l.limite.categoria.id));
    return categorias.filter((c) => !comLimite.has(c.id));
  }, [categorias, linhas]);

  async function excluir(linha: Linha) {
    if (!confirm(`Excluir o limite de "${linha.limite.categoria.nome}"?`)) return;
    try {
      await excluirLimite(linha.limite.id);
      desselecionarTodos([linha.limite.id]);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function excluirSelecionados() {
    const ids = Array.from(selecionados);
    const plural = ids.length > 1;
    if (!confirm(`Excluir ${ids.length} limite${plural ? "s" : ""} selecionado${plural ? "s" : ""}?`)) return;
    const resultados = await Promise.allSettled(ids.map((id) => excluirLimite(id)));
    const falhas = resultados.filter((r) => r.status === "rejected").length;
    if (falhas > 0) {
      setErro(`${falhas} de ${ids.length} limite(s) não puderam ser excluídos.`);
    }
    limpar();
    carregar();
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-grouper-sky/20 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-grouper-sky/20 p-4">
        <h2 className="font-display text-lg font-semibold text-grouper-ink">
          Limites
        </h2>
        <button
          onClick={abrirNovo}
          className="rounded-md bg-grouper-deep px-3 py-1.5 font-display text-[13px] uppercase tracking-wide text-white hover:bg-grouper-ink"
        >
          + Novo limite
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {erro && (
          <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
            {erro}
          </p>
        )}

        {/* Barra de seleção múltipla e "Selecionar todos" só aparecem quando
            pelo menos 1 item está selecionado — mesmo padrão de "Todas as
            despesas do mês". */}
        {selecionados.size > 0 && (
          <>
            <BarraSelecao
              quantidade={selecionados.size}
              texto={`${selecionados.size} limite${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""}`}
              onExcluir={excluirSelecionados}
              onCancelar={limpar}
            />
            <SelecionarTodos
              marcado={todosSelecionados(linhas.map((l) => l.limite.id))}
              onAlternar={() =>
                todosSelecionados(linhas.map((l) => l.limite.id))
                  ? limpar()
                  : selecionarTodos(linhas.map((l) => l.limite.id))
              }
            />
          </>
        )}

        {carregando ? (
          <p className="text-sm text-grouper-navy/60">Carregando...</p>
        ) : linhas.length === 0 ? (
          <p className="text-sm text-grouper-navy/60">
            Nenhum limite definido ainda.
          </p>
        ) : (
            <ul
              className={`space-y-1 ${
                linhas.length > 3 ? "max-h-60 overflow-y-auto pr-1" : ""
              }`}
            >
              {linhas.map(({ limite, status }) => {
                const proporcao =
                  status.valorLimite > 0 ? status.valorGasto / status.valorLimite : 0;
                const largura = Math.min(proporcao, 1) * 100;
                const selecionado = selecionados.has(limite.id);
                return (
                  <li key={limite.id}>
                    <div
                      onClick={() => alternar(limite.id)}
                      className={`cursor-pointer rounded-md px-2 py-1 transition-colors ${
                        selecionado ? "bg-grouper-sky/30" : "hover:bg-grouper-sky/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[15px] text-grouper-ink">
                            {limite.categoria.nome}
                          </p>
                          <p className="text-[13px] font-medium text-grouper-deep">
                            {formatarBRL(status.valorGasto)} de{" "}
                            {formatarBRL(status.valorLimite)}
                          </p>
                        </div>
                        <div
                          className="flex shrink-0 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {status.estourado && (
                            <span className="rounded-full bg-grouper-red/10 px-2 py-0.5 text-[13px] font-medium text-grouper-red">
                              Estourou
                            </span>
                          )}
                          <button
                            onClick={() => abrirEdicao(limite)}
                            aria-label="Editar"
                            title="Editar"
                            className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                          >
                            <IconeEditar className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => excluir({ limite, status })}
                            aria-label="Excluir"
                            title="Excluir"
                            className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                          >
                            <IconeExcluir className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grouper-mist">
                        <div
                          className={`h-full rounded-full ${corDaBarra(status.estourado, proporcao)}`}
                          style={{ width: `${largura}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-right text-[13px] font-medium text-grouper-deep">
                        {Math.round(proporcao * 100)}% do limite
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
        )}
      </div>

      <NovoLimiteModal
        aberto={modalAberto}
        limite={editando}
        onClose={() => setModalAberto(false)}
        onCriado={() => {
          setModalAberto(false);
          carregar();
        }}
        categorias={editando ? categorias : categoriasSemLimite}
      />
    </section>
  );
}
