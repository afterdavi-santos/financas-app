import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "../components/StatCard";
import { NovaDespesaModal } from "../components/NovaDespesaModal";
import { NovaCategoriaModal } from "../components/NovaCategoriaModal";
import { NovaRendaModal } from "../components/NovaRendaModal";
import { SimularDespesaModal } from "../components/SimularDespesaModal";
import { NovoInvestimentoCdbModal } from "../components/NovoInvestimentoCdbModal";
import { ResgatarCdbModal } from "../components/ResgatarCdbModal";
import { InvestirMaisModal } from "../components/InvestirMaisModal";
import { BarraSelecao } from "../components/BarraSelecao";
import { SelecionarTodos } from "../components/SelecionarTodos";
import { useSelecao } from "../hooks/useSelecao";
import { listarCategorias } from "../api/categorias";
import { listarDespesas } from "../api/despesas";
import { totalRenda, listarRendas } from "../api/rendas";
import {
  listarInvestimentosCdb,
  posicaoInvestimentoCdb,
  excluirInvestimentoCdb,
} from "../api/investimentosCdb";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoDespesa, dataBR, mesCurtoBR } from "../utils/rotulos";
import {
  mesAtualYYYYMM,
  primeiroDiaDoMesISO,
  ultimoDiaDoMesISO,
  primeiroDiaDoProximoMesISO,
} from "../utils/datas";
import { planoContencao } from "../utils/contencaoRendaVariavel";
import type {
  Categoria,
  Despesa,
  InvestimentoCdb,
  PosicaoCdb,
  Renda,
} from "../types/financas";

// Guardamos no localStorage o último mês em que o usuário já viu o lembrete de
// redefinir limites, para mostrá-lo uma vez por mês (ao entrar no mês novo).
const CHAVE_LEMBRETE = "financas.lembreteLimites";

export function HomePage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [renda, setRenda] = useState(0);
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Investimentos CDB: só os ATIVOS (dataResgate null) aparecem aqui.
  const [investimentos, setInvestimentos] = useState<InvestimentoCdb[]>([]);
  const [posicoesCdb, setPosicoesCdb] = useState<Record<number, PosicaoCdb>>({});

  // Controle de qual modal está aberto.
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [modalRenda, setModalRenda] = useState(false);
  const [modalSimular, setModalSimular] = useState(false);
  const [modalInvestimento, setModalInvestimento] = useState(false);
  const [editandoInvestimento, setEditandoInvestimento] = useState<InvestimentoCdb | null>(null);
  const [resgatando, setResgatando] = useState<InvestimentoCdb | null>(null);
  const [investindoMaisEm, setInvestindoMaisEm] = useState<InvestimentoCdb | null>(null);
  const {
    selecionados: cdbSelecionados,
    alternar: alternarCdb,
    limpar: limparCdb,
    selecionarTodos: selecionarTodosCdb,
    desselecionarTodos: desselecionarTodosCdb,
    todosSelecionados: todosSelecionadosCdb,
  } = useSelecao();

  const navigate = useNavigate();

  // Mostra o lembrete de limites se ainda não foi visto neste mês.
  // (Inicializa lendo o localStorage uma única vez, no primeiro render.)
  const [mostrarLembrete, setMostrarLembrete] = useState(
    () => localStorage.getItem(CHAVE_LEMBRETE) !== mesAtualYYYYMM(),
  );

  // Marca o lembrete como visto neste mês (não reaparece até o mês seguinte).
  function dispensarLembrete() {
    localStorage.setItem(CHAVE_LEMBRETE, mesAtualYYYYMM());
    setMostrarLembrete(false);
  }

  // Busca tudo o que a home precisa: categorias, despesas do mês, renda do mês
  // e investimentos CDB. Promise.all dispara em paralelo (mais rápido).
  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const inicio = primeiroDiaDoMesISO();
      const fim = ultimoDiaDoMesISO();
      const [cats, desps, tot, rds, invs] = await Promise.all([
        listarCategorias(),
        listarDespesas({ inicio, fim }),
        totalRenda(inicio), // mesReferencia = 1º dia do mês
        listarRendas(),
        listarInvestimentosCdb(),
      ]);
      setCategorias(cats);
      setDespesas(desps);
      setRenda(tot);
      setRendas(rds);
      // Só os ativos aparecem na home (os encerrados já viraram Renda do mês do resgate).
      setInvestimentos(invs.filter((i) => i.dataResgate === null));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  // useEffect com [] roda uma vez, quando a página monta (primeira carga).
  useEffect(() => {
    carregar();
  }, []);

  // Busca a posição (valor atual) de cada investimento ativo assim que a
  // lista chega — separado do carregar() para não travar o resto da home
  // esperando o cálculo de CDI.
  useEffect(() => {
    if (investimentos.length === 0) return;
    Promise.all(
      investimentos.map((i) => posicaoInvestimentoCdb(i.id).then((p) => [i.id, p] as const)),
    )
      .then((pares) => setPosicoesCdb(Object.fromEntries(pares)))
      .catch(() => {
        // Sem posição calculada ainda: os cards de investimento simplesmente
        // mostram o valor aplicado até a próxima tentativa.
      });
  }, [investimentos]);

  // Derivados do estado (recalculados a cada render, sem estado extra):
  const totalDespesas = despesas.reduce((soma, d) => soma + d.valor, 0);
  const economia = renda - totalDespesas;

  // 3 últimas por data (desc). [...] copia antes de ordenar (sort muta o array).
  const ultimasDespesas = [...despesas]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 3);

  // Plano de contenção: só faz sentido reduzir despesas se a renda FIXA sozinha
  // não bastaria para cobrir as despesas deste mês (ou seja, o mês só "fechou"
  // graças à renda variável). Se a renda fixa já cobre tudo, não há risco real
  // para o mês seguinte — a seção continua visível, mas sem sugestão de corte.
  const rendasDoMes = rendas.filter(
    (r) => r.mesReferencia === primeiroDiaDoMesISO(),
  );
  const rendaFixaMes = rendasDoMes
    .filter((r) => r.tipo === "FIXA")
    .reduce((soma, r) => soma + r.valor, 0);
  const rendaVariavelMes = rendasDoMes
    .filter((r) => r.tipo === "FREELA" || r.tipo === "RETORNO_INVESTIMENTOS")
    .reduce((soma, r) => soma + r.valor, 0);
  const valorNecessarioReduzir = Math.max(0, totalDespesas - rendaFixaMes);
  const despesasExtraordinarias = despesas.filter(
    (d) => d.tipo === "EXTRAORDINARIA",
  );
  const plano = planoContencao(despesasExtraordinarias, valorNecessarioReduzir);

  // Chamado quando um modal salva com sucesso: fecha e recarrega os dados.
  function aoSalvar() {
    setModalDespesa(false);
    setModalCategoria(false);
    setModalRenda(false);
    carregar();
  }

  function abrirNovoInvestimento() {
    setEditandoInvestimento(null);
    setModalInvestimento(true);
  }

  function abrirEdicaoInvestimento(investimento: InvestimentoCdb) {
    setEditandoInvestimento(investimento);
    setModalInvestimento(true);
  }

  async function excluirInvestimento(investimento: InvestimentoCdb) {
    if (!confirm(`Excluir o investimento "${investimento.descricao}"?`)) return;
    try {
      await excluirInvestimentoCdb(investimento.id);
      desselecionarTodosCdb([investimento.id]);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function excluirInvestimentosSelecionados() {
    const ids = Array.from(cdbSelecionados);
    const plural = ids.length > 1;
    if (!confirm(`Excluir ${ids.length} investimento${plural ? "s" : ""} selecionado${plural ? "s" : ""}?`)) return;
    const resultados = await Promise.allSettled(ids.map((id) => excluirInvestimentoCdb(id)));
    const falhas = resultados.filter((r) => r.status === "rejected").length;
    if (falhas > 0) {
      setErro(`${falhas} de ${ids.length} investimento(s) não puderam ser excluídos.`);
    }
    limparCdb();
    carregar();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Início</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalRenda(true)}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + Adicionar renda
          </button>
          <button
            onClick={() => setModalDespesa(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Adicionar despesa
          </button>
          <button
            onClick={() => setModalCategoria(true)}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            + Adicionar categoria
          </button>
          <button
            onClick={() => setModalSimular(true)}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Simular despesa
          </button>
        </div>
      </div>

      {/* Lembrete de início de mês: sugere redefinir os limites de gastos. */}
      {mostrarLembrete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            O mês virou! Deseja redefinir seus limites de despesas?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                dispensarLembrete();
                navigate("/limites");
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sim, redefinir
            </button>
            <button
              onClick={dispensarLembrete}
              className="rounded-md px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Agora não
            </button>
          </div>
        </div>
      )}

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <>
          {/* Macros do mês */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard titulo="Renda do mês" valor={renda} />
            <StatCard
              titulo="Despesas do mês"
              valor={totalDespesas}
              destaque="negativo"
            />
            <StatCard
              titulo="Economia do mês"
              valor={economia}
              destaque={economia >= 0 ? "positivo" : "negativo"}
            />
          </div>

          {/* Plano de contenção: seção FIXA na home (sempre visível). Só mostra
              sugestão de corte quando a renda fixa sozinha não cobriria as
              despesas deste mês — ou seja, quando o mês só "fechou" com a
              ajuda da renda variável. Caso contrário, mostra que está tudo bem. */}
          <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">
              Plano de contenção — {mesCurtoBR(primeiroDiaDoProximoMesISO())}
            </h2>
            {plano ? (
              <>
                {economia < 0 && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                    Atenção: mesmo com a ajuda da renda variável, este mês já
                    fechou no negativo (economia de {formatarBRL(economia)}).
                    Isso torna ainda mais urgente reduzir estas despesas.
                  </p>
                )}
                <p className="text-sm text-slate-600">
                  {rendaVariavelMes > 0
                    ? `Sua renda fixa (${formatarBRL(rendaFixaMes)}) não seria suficiente para cobrir as despesas deste mês (${formatarBRL(totalDespesas)}) sem a ajuda de ${formatarBRL(rendaVariavelMes)} em renda variável (freelas e retornos de investimento) — valores sem garantia de se repetir.`
                    : `As despesas deste mês (${formatarBRL(totalDespesas)}) já superam sua renda fixa (${formatarBRL(rendaFixaMes)}), mesmo sem nenhuma renda variável este mês.`}
                </p>
                <p className="text-sm text-slate-700">
                  Para não fechar o próximo mês no negativo, considere reduzir
                  estas despesas extraordinárias em{" "}
                  {formatarBRL(plano.totalReducaoSugerida)}:
                </p>
                <ul className="divide-y divide-slate-100">
                  {plano.categorias.map((c) => (
                    <li
                      key={c.nome}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="text-slate-700">
                        {c.nome}{" "}
                        <span className="text-slate-400">
                          ({formatarBRL(c.gastoAtual)})
                        </span>
                      </span>
                      <span className="font-medium text-red-600">
                        -{formatarBRL(c.reducaoSugerida)} (
                        {c.percentualReducao.toFixed(0)}%)
                      </span>
                    </li>
                  ))}
                </ul>
                {!plano.cobreQueda && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Mesmo reduzindo todas as despesas extraordinárias a zero,
                    ainda faltariam {formatarBRL(plano.faltante)} para fechar o
                    próximo mês só com a renda fixa. Vale revisar despesas
                    fixas ou buscar reforçar a renda fixa.
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                {rendaVariavelMes > 0
                  ? `Este mês você teve ${formatarBRL(rendaVariavelMes)} em renda variável, mas sua renda fixa (${formatarBRL(rendaFixaMes)}) já cobre sozinha as despesas do mês (${formatarBRL(totalDespesas)}) — nada precisa ser reduzido.`
                  : `Sua renda fixa (${formatarBRL(rendaFixaMes)}) cobre as despesas deste mês (${formatarBRL(totalDespesas)}) — nada precisa ser reduzido.`}
              </p>
            )}
          </section>

          {/* Investimento CDB: só o que dá pra calcular automaticamente.
              Só conta como renda no mês em que for resgatado. */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Investimento CDB
              </h2>
              <button
                onClick={abrirNovoInvestimento}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                + Novo investimento
              </button>
            </div>
            {investimentos.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum investimento CDB ativo.
              </p>
            ) : (
              <>
                <BarraSelecao
                  quantidade={cdbSelecionados.size}
                  texto={`${cdbSelecionados.size} investimento${cdbSelecionados.size > 1 ? "s" : ""} selecionado${cdbSelecionados.size > 1 ? "s" : ""}`}
                  onExcluir={excluirInvestimentosSelecionados}
                  onCancelar={limparCdb}
                />
                <div className="mb-3">
                  <SelecionarTodos
                    marcado={todosSelecionadosCdb(investimentos.map((i) => i.id))}
                    onAlternar={() =>
                      todosSelecionadosCdb(investimentos.map((i) => i.id))
                        ? limparCdb()
                        : selecionarTodosCdb(investimentos.map((i) => i.id))
                    }
                  />
                </div>
                <ul className="divide-y divide-slate-100">
                {investimentos.map((inv) => {
                  const posicao = posicoesCdb[inv.id];
                  return (
                    <li key={inv.id} className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={cdbSelecionados.has(inv.id)}
                            onChange={() => alternarCdb(inv.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-medium text-slate-800">
                              {inv.descricao}{" "}
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                {inv.percentualCdi}% do CDI
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">
                              Aplicado em {dataBR(inv.dataAplicacao)}
                            </p>
                          </div>
                        </label>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-indigo-700">
                            {formatarBRL(posicao ? posicao.valorAtual : inv.valorAplicado)}
                          </span>
                          <button
                            onClick={() => setInvestindoMaisEm(inv)}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            Investir mais
                          </button>
                          <button
                            onClick={() => setResgatando(inv)}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            Resgatar
                          </button>
                          <button
                            onClick={() => abrirEdicaoInvestimento(inv)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => excluirInvestimento(inv)}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                      {posicao && (
                        <p className="mt-1 text-xs text-slate-500">
                          Rendeu {formatarBRL(posicao.rendimentoBruto)} em{" "}
                          {posicao.diasUteisRendidos} dias úteis
                        </p>
                      )}
                    </li>
                  );
                })}
                </ul>
              </>
            )}
          </section>

          {/* Últimas despesas */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              Últimas despesas
            </h2>
            {ultimasDespesas.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma despesa lançada neste mês ainda.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {ultimasDespesas.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {d.descricao}
                      </p>
                      <p className="text-xs text-slate-500">
                        {d.categoria.nome} · {rotuloTipoDespesa[d.tipo]} ·{" "}
                        {dataBR(d.data)}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-800">
                      {formatarBRL(d.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <NovaDespesaModal
        aberto={modalDespesa}
        onClose={() => setModalDespesa(false)}
        onCriada={aoSalvar}
        categorias={categorias}
      />
      <NovaCategoriaModal
        aberto={modalCategoria}
        onClose={() => setModalCategoria(false)}
        onCriada={aoSalvar}
      />
      <NovaRendaModal
        aberto={modalRenda}
        onClose={() => setModalRenda(false)}
        onCriada={aoSalvar}
      />
      <SimularDespesaModal
        aberto={modalSimular}
        onClose={() => setModalSimular(false)}
        categorias={categorias}
      />
      <NovoInvestimentoCdbModal
        aberto={modalInvestimento}
        investimento={editandoInvestimento}
        onClose={() => setModalInvestimento(false)}
        onSalvo={() => {
          setModalInvestimento(false);
          carregar();
        }}
      />
      <ResgatarCdbModal
        investimento={resgatando}
        onClose={() => setResgatando(null)}
        onResgatado={() => {
          setResgatando(null);
          carregar();
        }}
      />
      <InvestirMaisModal
        investimento={investindoMaisEm}
        onClose={() => setInvestindoMaisEm(null)}
        onInvestido={() => {
          setInvestindoMaisEm(null);
          carregar();
        }}
      />
    </div>
  );
}
