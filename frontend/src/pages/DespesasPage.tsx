import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { NovaDespesaModal } from "../components/NovaDespesaModal";
import { DetalheDespesasModal } from "../components/DetalheDespesasModal";
import { BarraSelecao } from "../components/BarraSelecao";
import { SelecionarTodos } from "../components/SelecionarTodos";
import { IconeEditar, IconeExcluir } from "../components/IconesInvestimento";
import { GraficoDespesasMensal, type PontoDespesa } from "../components/GraficoDespesasMensal";
import { useSelecao } from "../hooks/useSelecao";
import { listarDespesas, excluirDespesa } from "../api/despesas";
import { listarCategorias } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoDespesa, dataBR, mesCurtoBR } from "../utils/rotulos";
import {
  hojeISO,
  mesAtualYYYYMM,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
  mesAnteriorYYYYMM,
  primeiroDiaMesesAtrasDoMes,
} from "../utils/datas";
import {
  somaPorTipo,
  totalPorCategoria,
  variacaoCategorias,
  maiorAlta,
  maiorBaixa,
} from "../utils/despesasResumo";
import type { VariacaoCategoria } from "../utils/despesasResumo";
import type { Categoria, Despesa, TipoDespesa } from "../types/financas";

// Filtro da lista "Todas as despesas do mês" (canto direito do cabeçalho da
// seção, no lugar de "Selecionar todos").
type FiltroTipo = "TODAS" | TipoDespesa;
const FILTROS: { chave: FiltroTipo; rotulo: string }[] = [
  { chave: "TODAS", rotulo: "Todas" },
  { chave: "FIXA", rotulo: "Fixas" },
  { chave: "EXTRAORDINARIA", rotulo: "Variáveis" },
];

// Formata o % de variação (ou "nova" quando não havia gasto no mês anterior).
function textoPct(v: VariacaoCategoria): string {
  if (v.deltaPct === null) return "nova";
  const sinal = v.deltaPct > 0 ? "+" : "";
  return `${sinal}${Math.round(v.deltaPct)}%`;
}

interface Props {
  // Nó onde os controles do cabeçalho (mês + adicionar) são portados, pra
  // ficarem na mesma linha horizontal do seletor de aba (MovimentacoesPage).
  headerSlot?: HTMLDivElement | null;
  // Nó onde o gráfico de despesas mensais é portado, pra aparecer na coluna
  // direita (MovimentacoesPage) em vez de dentro da coluna principal.
  graficoSlot?: HTMLDivElement | null;
}

export function DespesasPage({ headerSlot, graficoSlot }: Props = {}) {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [despesasAnterior, setDespesasAnterior] = useState<Despesa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  // Últimos 6 meses de despesas, para o gráfico da coluna direita.
  const [historicoDespesas, setHistoricoDespesas] = useState<PontoDespesa[]>([]);
  const [mes, setMes] = useState(mesAtualYYYYMM()); // "YYYY-MM"
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Despesa em edição (null = modal em modo "nova despesa").
  const [editando, setEditando] = useState<Despesa | null>(null);
  // Filtro da lista completa por tipo (Todas/Fixas/Variáveis).
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("TODAS");
  // Filtro (independente) da seção "Despesas por categoria".
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroTipo>("TODAS");
  // Um único estado controla qual detalhamento está aberto (null = fechado).
  const [detalhe, setDetalhe] = useState<{
    titulo: string;
    despesas: Despesa[];
  } | null>(null);
  const {
    selecionados,
    alternar,
    limpar,
    selecionarTodos,
    desselecionarTodos,
    todosSelecionados,
  } = useSelecao();

  // Busca as despesas do mês selecionado E do mês anterior (para a comparação).
  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const anterior = mesAnteriorYYYYMM(mes);
      const [desps, despsAnterior, cats, despesasHistorico] = await Promise.all([
        listarDespesas({
          inicio: primeiroDiaDoMes(mes),
          fim: ultimoDiaDoMes(mes),
        }),
        listarDespesas({
          inicio: primeiroDiaDoMes(anterior),
          fim: ultimoDiaDoMes(anterior),
        }),
        listarCategorias(),
        // Últimos 6 meses a partir do mês em foco (o selecionado no filtro,
        // não necessariamente hoje), pro gráfico "Despesas dos últimos
        // meses" da coluna direita — busca tudo de uma vez e agrupa por
        // mês/tipo no cliente (igual ao histórico de renda).
        listarDespesas({
          inicio: primeiroDiaMesesAtrasDoMes(mes, 5),
          fim: ultimoDiaDoMes(mes),
        }),
      ]);
      setDespesas(desps);
      setDespesasAnterior(despsAnterior);
      setCategorias(cats);

      const meses: string[] = [];
      let mesIterado = mes;
      for (let i = 0; i < 6; i++) {
        meses.unshift(mesIterado);
        mesIterado = mesAnteriorYYYYMM(mesIterado);
      }
      setHistoricoDespesas(
        meses.map((m) => {
          let fixa = 0;
          let variavel = 0;
          for (const d of despesasHistorico) {
            if (d.data.slice(0, 7) !== m) continue;
            if (d.tipo === "FIXA") fixa += d.valor;
            else variavel += d.valor;
          }
          return { rotulo: mesCurtoBR(`${m}-01`), Fixa: fixa, Variavel: variavel };
        }),
      );
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  // Recarrega na primeira carga e sempre que o mês muda.
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  // useMemo: só recalcula os resumos quando as despesas mudam (evita refazer a
  // agregação a cada render). Toda a lógica pesada vive em utils/despesasResumo.
  const resumo = useMemo(() => {
    const totalFixas = somaPorTipo(despesas, "FIXA");
    const totalExtra = somaPorTipo(despesas, "EXTRAORDINARIA");
    // Todas as categorias (não só as 5 maiores) — a lista tem rolagem própria.
    const porCategoria = totalPorCategoria(
      despesas,
      filtroCategoria === "TODAS" ? undefined : filtroCategoria,
    );
    // Atenção/parabéns comparam APENAS despesas extraordinárias entre os meses.
    const variacoes = variacaoCategorias(
      despesas.filter((d) => d.tipo === "EXTRAORDINARIA"),
      despesasAnterior.filter((d) => d.tipo === "EXTRAORDINARIA"),
    );
    return {
      totalFixas,
      totalExtra,
      porCategoria,
      alta: maiorAlta(variacoes),
      baixa: maiorBaixa(variacoes),
    };
  }, [despesas, despesasAnterior, filtroCategoria]);

  async function excluir(despesa: Despesa) {
    if (!confirm(`Excluir a despesa "${despesa.descricao}"?`)) return;
    try {
      await excluirDespesa(despesa.id);
      desselecionarTodos([despesa.id]);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function excluirSelecionadas() {
    const ids = Array.from(selecionados);
    const plural = ids.length > 1;
    if (!confirm(`Excluir ${ids.length} despesa${plural ? "s" : ""} selecionada${plural ? "s" : ""}?`)) return;
    const resultados = await Promise.allSettled(ids.map((id) => excluirDespesa(id)));
    const falhas = resultados.filter((r) => r.status === "rejected").length;
    if (falhas > 0) {
      setErro(`${falhas} de ${ids.length} despesa(s) não puderam ser excluídas.`);
    }
    limpar();
    carregar();
  }

  // Mais recentes primeiro (por data), já filtradas pelo tipo escolhido.
  const ordenadas = despesas
    .filter((d) => filtroTipo === "TODAS" || d.tipo === filtroTipo)
    .sort((a, b) => b.data.localeCompare(a.data));

  // Nova despesa cai no mês em foco: hoje se for o mês atual; senão, dia 1 dele.
  const dataPadraoNova =
    mes === mesAtualYYYYMM() ? hojeISO() : primeiroDiaDoMes(mes);

  function abrirNovaDespesa() {
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicaoDespesa(despesa: Despesa) {
    setEditando(despesa);
    setModalAberto(true);
  }

  // Troca o mês em foco — usada tanto pelo seletor de mês quanto ao clicar
  // numa coluna do gráfico "Despesas dos últimos meses" (mesmo efeito).
  function selecionarMes(novoMes: string) {
    // O "Limpar" do seletor nativo manda "" — mês em foco não pode ficar
    // vazio (quebraria os cálculos do mês), então ignora.
    if (!novoMes) return;
    limpar(); // seleção era da lista do mês anterior
    setMes(novoMes);
  }

  const controlesCabecalho = (
    <>
      <input
        type="month"
        value={mes}
        onChange={(e) => selecionarMes(e.target.value)}
        // O navegador só abre o seletor nativo ao clicar no ícone do
        // calendário; showPicker() faz o clique em qualquer parte do "botão"
        // abrir o mesmo seletor.
        onClick={(e) => e.currentTarget.showPicker?.()}
        className="w-full cursor-pointer rounded-md border-2 border-grouper-mid bg-white px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-grouper-ink shadow-sm transition-colors hover:bg-grouper-mist focus:outline-none focus:ring-2 focus:ring-grouper-mid lg:w-36"
      />
      <button
        onClick={abrirNovaDespesa}
        className="w-full rounded-md bg-grouper-ink px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-black lg:w-auto"
      >
        + Adicionar despesa
      </button>
    </>
  );

  const graficoDespesas = (
    <section className="rounded-lg border border-grouper-sky/20 bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-display text-lg font-semibold text-grouper-ink">
        Despesas dos últimos meses
      </h2>
      <GraficoDespesasMensal dados={historicoDespesas} />
    </section>
  );

  return (
    <div className="w-full space-y-6">
      {headerSlot ? (
        createPortal(controlesCabecalho, headerSlot)
      ) : (
        <PageHeader>{controlesCabecalho}</PageHeader>
      )}

      {graficoSlot && createPortal(graficoDespesas, graficoSlot)}

      {erro && (
        <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
          ⚠ {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-grouper-navy/60">Carregando...</p>
      ) : (
        <>
          {/* Dois cards-resumo (sem clique: a lista completa embaixo já
              permite ver/filtrar por tipo). Mesmo grid-cols-2 (sem
              breakpoint) do StatCard de Renda/Despesas do mês na Home, pra
              ficarem exatamente do mesmo tamanho. */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              titulo="Despesas fixas"
              valor={resumo.totalFixas}
              destaque="negativo"
            />
            <StatCard
              titulo="Despesas variáveis"
              valor={resumo.totalExtra}
              destaque="negativo"
            />
          </div>

          {/* "Despesas por categoria" (2/3 da largura, à esquerda) lado a
              lado com Ponto de atenção + Parabéns (insights vs. mês
              anterior, 1/3 restante, à direita). Ponto de atenção/Parabéns
              dividem essa coluna, empilhados; `items-stretch` (padrão do
              grid) faz a coluna esticar pra soma das duas bater com a altura
              de "Despesas por categoria" no tamanho máximo dela (5
              categorias, antes de vir a rolagem). */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Despesas por categoria (todas, não só as 5 maiores): cada
                linha abre o detalhe. Filtro Todas/Fixas/Variáveis próprio,
                independente do filtro da lista completa abaixo. */}
            <section className="rounded-lg border border-grouper-sky/20 bg-white p-4 shadow-sm sm:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-grouper-ink">
                  Despesas por categoria
                </h2>
                <div className="flex items-center gap-1">
                  {FILTROS.map((f) => (
                    <button
                      key={f.chave}
                      onClick={() => setFiltroCategoria(f.chave)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        filtroCategoria === f.chave
                          ? "bg-grouper-sky/40 text-grouper-ink"
                          : "text-grouper-navy/60 hover:bg-grouper-sky/25 hover:text-grouper-ink"
                      }`}
                    >
                      {f.rotulo}
                    </button>
                  ))}
                </div>
              </div>
              {resumo.porCategoria.length === 0 ? (
                <p className="text-sm text-grouper-navy/60">
                  {filtroCategoria === "TODAS"
                    ? "Nenhuma despesa neste mês."
                    : `Nenhuma despesa ${filtroCategoria === "FIXA" ? "fixa" : "variável"} neste mês.`}
                </p>
              ) : (
                <ul
                  className={`divide-y divide-grouper-sky/45 ${
                    resumo.porCategoria.length > 5 ? "max-h-40 overflow-y-auto pr-1" : ""
                  }`}
                >
                  {resumo.porCategoria.map((c) => (
                    <li key={c.nome}>
                      <button
                        onClick={() =>
                          setDetalhe({
                            titulo:
                              filtroCategoria === "TODAS"
                                ? c.nome
                                : `${c.nome} — ${filtroCategoria === "FIXA" ? "fixas" : "variáveis"}`,
                            despesas: despesas.filter(
                              (d) =>
                                d.categoria.nome === c.nome &&
                                (filtroCategoria === "TODAS" || d.tipo === filtroCategoria),
                            ),
                          })
                        }
                        className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-2 text-left transition-all hover:bg-grouper-sky/20 hover:shadow-md"
                      >
                        <span className="text-sm text-grouper-ink">{c.nome}</span>
                        <span className="text-sm font-semibold text-grouper-ink">
                          {formatarBRL(c.total)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-col gap-4">
              <section className="flex-1 rounded-lg border-l-4 border-amber-400 bg-white p-4 shadow-md">
                <h2 className="font-display text-sm font-semibold tracking-wide text-amber-800">
                  Ponto de atenção 
                </h2>
                {resumo.alta ? (
                  <p className="mt-2 text-sm text-amber-900"> As despesas com a categoria 
                  <strong> {resumo.alta.nome}</strong> subiram {" "}
                    <strong>{formatarBRL(resumo.alta.deltaRs)}</strong> em relação ao mês anterior.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-amber-900">
                    Parabéns, Nenhuma categoria aumentou de valor em relação ao mês anterior.
                  </p>
                )}
              </section>

              <section className="flex-1 rounded-lg border-l-4 border-grouper-green bg-white p-4 shadow-md">
                <h2 className="font-display text-sm font-semibold tracking-wide text-grouper-green">
                  Ponto de motivação
                </h2>
                {resumo.baixa ? (
                  <p className="mt-2 text-sm text-grouper-ink"> As despesas com a categoria
                    <strong> {resumo.baixa.nome}</strong> caíram{" "}
                    <strong> {formatarBRL(Math.abs(resumo.baixa.deltaRs))}</strong> (
                    {textoPct(resumo.baixa)}) em relação ao mês anterior.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-grouper-ink">
                    Nenhuma categoria diminuiu em relação ao mês anterior.
                  </p>
                )}
              </section>
            </div>
          </div>

          {/* Lista completa das despesas do mês (com filtro por tipo, editar
              e excluir). */}
          <section className="rounded-lg border border-grouper-sky/20 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-grouper-ink">
                Todas as despesas do mês
              </h2>
              {/* Filtro Todas/Fixas/Variáveis — mesmo tratamento de hover
                  (azul mais escuro pra indicar que é clicável) das linhas
                  de Investimento CDB na Home. */}
              <div className="flex items-center gap-1">
                {FILTROS.map((f) => (
                  <button
                    key={f.chave}
                    onClick={() => setFiltroTipo(f.chave)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      filtroTipo === f.chave
                        ? "bg-grouper-sky/40 text-grouper-ink"
                        : "text-grouper-navy/60 hover:bg-grouper-sky/25 hover:text-grouper-ink"
                    }`}
                  >
                    {f.rotulo}
                  </button>
                ))}
              </div>
            </div>

            {/* Barra de seleção múltipla e "Selecionar todos" só aparecem
                quando pelo menos 1 item está selecionado — mesmo padrão do
                Investimento CDB na Home. */}
            {selecionados.size > 0 && (
              <>
                <BarraSelecao
                  quantidade={selecionados.size}
                  texto={`${selecionados.size} despesa${selecionados.size > 1 ? "s" : ""} selecionada${selecionados.size > 1 ? "s" : ""}`}
                  onExcluir={excluirSelecionadas}
                  onCancelar={limpar}
                />
                <div className="my-3">
                  <SelecionarTodos
                    marcado={todosSelecionados(ordenadas.map((d) => d.id))}
                    onAlternar={() =>
                      todosSelecionados(ordenadas.map((d) => d.id))
                        ? limpar()
                        : selecionarTodos(ordenadas.map((d) => d.id))
                    }
                  />
                </div>
              </>
            )}

            {ordenadas.length === 0 ? (
              <p className="text-sm text-grouper-navy/60">
                {filtroTipo === "TODAS"
                  ? "Nenhuma despesa lançada neste mês ainda."
                  : `Nenhuma despesa ${filtroTipo === "FIXA" ? "fixa" : "variável"} neste mês.`}
              </p>
            ) : (
              <ul
                className={`divide-y divide-grouper-sky/45 ${
                  ordenadas.length > 3 ? "max-h-49 overflow-y-auto pr-1" : ""
                }`}
              >
                {ordenadas.map((d) => {
                  const selecionado = selecionados.has(d.id);
                  return (
                    <li key={d.id}>
                      <div
                        onClick={() => alternar(d.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-3 transition-colors ${
                          selecionado ? "bg-grouper-sky/30" : "hover:bg-grouper-sky/20"
                        }`}
                      >
                        <div>
                          <p className="text-grouper-ink">
                            {d.descricao}
                          </p>
                          <p className="text-xs font-medium text-grouper-deep">
                            {d.categoria.nome} · {rotuloTipoDespesa[d.tipo]} ·{" "}
                            {dataBR(d.data)}
                          </p>
                        </div>
                        <div
                          className="flex items-center gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="font-semibold text-grouper-ink">
                            {formatarBRL(d.valor)}
                          </span>
                          <button
                            onClick={() => abrirEdicaoDespesa(d)}
                            aria-label="Editar"
                            title="Editar"
                            className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                          >
                            <IconeEditar className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => excluir(d)}
                            aria-label="Excluir"
                            title="Excluir"
                            className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                          >
                            <IconeExcluir className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <NovaDespesaModal
        aberto={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setEditando(null);
        }}
        onCriada={() => {
          setModalAberto(false);
          setEditando(null);
          carregar();
        }}
        categorias={categorias}
        dataPadrao={dataPadraoNova}
        despesa={editando}
      />

      <DetalheDespesasModal
        titulo={detalhe?.titulo ?? ""}
        aberto={detalhe !== null}
        onClose={() => setDetalhe(null)}
        despesas={detalhe?.despesas ?? []}
      />
    </div>
  );
}
