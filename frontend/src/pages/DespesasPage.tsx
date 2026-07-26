import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { NovaDespesaModal } from "../components/NovaDespesaModal";
import { DetalheDespesasModal } from "../components/DetalheDespesasModal";
import { BarraSelecao } from "../components/BarraSelecao";
import { SelecionarTodos } from "../components/SelecionarTodos";
import { useSelecao } from "../hooks/useSelecao";
import { listarDespesas, excluirDespesa } from "../api/despesas";
import { listarCategorias } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoDespesa, dataBR } from "../utils/rotulos";
import {
  hojeISO,
  mesAtualYYYYMM,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
  mesAnteriorYYYYMM,
} from "../utils/datas";
import {
  somaPorTipo,
  topCategorias,
  variacaoCategorias,
  maiorAlta,
  maiorBaixa,
} from "../utils/despesasResumo";
import type { VariacaoCategoria } from "../utils/despesasResumo";
import type { Categoria, Despesa } from "../types/financas";

// Formata o % de variação (ou "nova" quando não havia gasto no mês anterior).
function textoPct(v: VariacaoCategoria): string {
  if (v.deltaPct === null) return "nova";
  const sinal = v.deltaPct > 0 ? "+" : "";
  return `${sinal}${Math.round(v.deltaPct)}%`;
}

export function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [despesasAnterior, setDespesasAnterior] = useState<Despesa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [mes, setMes] = useState(mesAtualYYYYMM()); // "YYYY-MM"
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
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
      const [desps, despsAnterior, cats] = await Promise.all([
        listarDespesas({
          inicio: primeiroDiaDoMes(mes),
          fim: ultimoDiaDoMes(mes),
        }),
        listarDespesas({
          inicio: primeiroDiaDoMes(anterior),
          fim: ultimoDiaDoMes(anterior),
        }),
        listarCategorias(),
      ]);
      setDespesas(desps);
      setDespesasAnterior(despsAnterior);
      setCategorias(cats);
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
    const top5 = topCategorias(despesas, 5, "EXTRAORDINARIA");
    // Atenção/parabéns comparam APENAS despesas extraordinárias entre os meses.
    const variacoes = variacaoCategorias(
      despesas.filter((d) => d.tipo === "EXTRAORDINARIA"),
      despesasAnterior.filter((d) => d.tipo === "EXTRAORDINARIA"),
    );
    return {
      totalFixas,
      totalExtra,
      top5,
      alta: maiorAlta(variacoes),
      baixa: maiorBaixa(variacoes),
    };
  }, [despesas, despesasAnterior]);

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

  // Mais recentes primeiro (por data).
  const ordenadas = [...despesas].sort((a, b) => b.data.localeCompare(a.data));

  // Nova despesa cai no mês em foco: hoje se for o mês atual; senão, dia 1 dele.
  const dataPadraoNova =
    mes === mesAtualYYYYMM() ? hojeISO() : primeiroDiaDoMes(mes);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader titulo="Despesas">
        <input
          type="month"
          value={mes}
          onChange={(e) => {
            limpar(); // seleção era da lista do mês anterior
            setMes(e.target.value);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setModalAberto(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Adicionar despesa
        </button>
      </PageHeader>

      <BarraSelecao
        quantidade={selecionados.size}
        texto={`${selecionados.size} despesa${selecionados.size > 1 ? "s" : ""} selecionada${selecionados.size > 1 ? "s" : ""}`}
        onExcluir={excluirSelecionadas}
        onCancelar={limpar}
      />

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <>
          {/* Dois cards-resumo clicáveis: abrem o detalhamento por tipo. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              titulo="Despesas fixas"
              valor={resumo.totalFixas}
              onClick={() =>
                setDetalhe({
                  titulo: "Despesas fixas do mês",
                  despesas: despesas.filter((d) => d.tipo === "FIXA"),
                })
              }
            />
            <StatCard
              titulo="Despesas extraordinárias"
              valor={resumo.totalExtra}
              onClick={() =>
                setDetalhe({
                  titulo: "Despesas extraordinárias do mês",
                  despesas: despesas.filter((d) => d.tipo === "EXTRAORDINARIA"),
                })
              }
            />
          </div>

          {/* Top 5 categorias (só extraordinárias): cada linha abre o detalhe. */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Top 5 categorias (extraordinárias)
            </h2>
            {resumo.top5.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma despesa extraordinária neste mês.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {resumo.top5.map((c) => (
                  <li key={c.nome}>
                    <button
                      onClick={() =>
                        setDetalhe({
                          titulo: `${c.nome} — extraordinárias`,
                          despesas: despesas.filter(
                            (d) =>
                              d.categoria.nome === c.nome &&
                              d.tipo === "EXTRAORDINARIA",
                          ),
                        })
                      }
                      className="flex w-full items-center justify-between py-2 text-left hover:text-blue-700"
                    >
                      <span className="text-sm text-slate-700">{c.nome}</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {formatarBRL(c.total)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Insights vs. mês anterior: atenção (subiu) e parabéns (caiu). */}
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-sm font-semibold text-amber-800">
                ⚠️ Ponto de atenção (extraordinárias)
              </h2>
              {resumo.alta ? (
                <p className="mt-2 text-sm text-amber-900">
                  <strong>{resumo.alta.nome}</strong> subiu{" "}
                  <strong>+{formatarBRL(resumo.alta.deltaRs)}</strong> (
                  {textoPct(resumo.alta)}) vs. o mês anterior.
                </p>
              ) : (
                <p className="mt-2 text-sm text-amber-900">
                  Nenhuma categoria aumentou em relação ao mês anterior.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h2 className="text-sm font-semibold text-green-800">
                🎉 Parabéns (extraordinárias)
              </h2>
              {resumo.baixa ? (
                <p className="mt-2 text-sm text-green-900">
                  <strong>{resumo.baixa.nome}</strong> caiu{" "}
                  <strong>{formatarBRL(resumo.baixa.deltaRs)}</strong> (
                  {textoPct(resumo.baixa)}) vs. o mês anterior.
                </p>
              ) : (
                <p className="mt-2 text-sm text-green-900">
                  Nenhuma categoria diminuiu em relação ao mês anterior.
                </p>
              )}
            </section>
          </div>

          {/* Lista completa das despesas do mês (com excluir). */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                Todas as despesas do mês
              </h2>
              {ordenadas.length > 0 && (
                <SelecionarTodos
                  marcado={todosSelecionados(ordenadas.map((d) => d.id))}
                  onAlternar={() =>
                    todosSelecionados(ordenadas.map((d) => d.id))
                      ? limpar()
                      : selecionarTodos(ordenadas.map((d) => d.id))
                  }
                />
              )}
            </div>
            {ordenadas.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma despesa lançada neste mês ainda.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {ordenadas.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between py-3"
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selecionados.has(d.id)}
                        onChange={() => alternar(d.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-slate-800">
                          {d.descricao}
                        </p>
                        <p className="text-xs text-slate-500">
                          {d.categoria.nome} · {rotuloTipoDespesa[d.tipo]} ·{" "}
                          {dataBR(d.data)}
                        </p>
                      </div>
                    </label>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-slate-800">
                        {formatarBRL(d.valor)}
                      </span>
                      <button
                        onClick={() => excluir(d)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <NovaDespesaModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        onCriada={() => {
          setModalAberto(false);
          carregar();
        }}
        categorias={categorias}
        dataPadrao={dataPadraoNova}
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
