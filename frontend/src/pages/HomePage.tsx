import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NovaDespesaModal } from "../components/NovaDespesaModal";
import { NovaRendaModal } from "../components/NovaRendaModal";
import { NovoInvestimentoCdbModal } from "../components/NovoInvestimentoCdbModal";
import { ResgatarCdbModal } from "../components/ResgatarCdbModal";
import { InvestirMaisModal } from "../components/InvestirMaisModal";
import { BarraSelecao } from "../components/BarraSelecao";
import { SelecionarTodos } from "../components/SelecionarTodos";
import { IconeEditar, IconeExcluir } from "../components/IconesInvestimento";
import { Modal } from "../components/Modal";
import { StatCard } from "../components/StatCard";
import { EconomiaDestaque } from "../components/EconomiaDestaque";
import { GraficoEconomiaHome, type PontoEconomia } from "../components/GraficoEconomiaHome";
import { ObjetivosResumoHome } from "../components/ObjetivosResumoHome";
import { useSelecao } from "../hooks/useSelecao";
import { listarCategorias } from "../api/categorias";
import { listarDespesas } from "../api/despesas";
import { totalRenda, listarRendas } from "../api/rendas";
import {
  listarInvestimentosCdb,
  posicaoInvestimentoCdb,
  excluirInvestimentoCdb,
} from "../api/investimentosCdb";
import { listarObjetivos } from "../api/objetivos";
import { compararMeses } from "../api/relatorios";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoDespesa, dataBR, mesCurtoBR } from "../utils/rotulos";
import {
  mesAtualYYYYMM,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
  mesSeguinteYYYYMM,
  primeiroDiaMesesAtrasDoMes,
} from "../utils/datas";
import { planoContencao, dificuldadeContencao } from "../utils/contencaoRendaVariavel";
import { corEscalaDificuldade } from "../utils/cores";
import type {
  Categoria,
  Despesa,
  InvestimentoCdb,
  Objetivo,
  PosicaoCdb,
  Renda,
} from "../types/financas";

// Guardamos no localStorage o último mês em que o usuário já viu o lembrete de
// redefinir limites, para mostrá-lo uma vez por mês (ao entrar no mês novo).
const CHAVE_LEMBRETE = "financas.lembreteLimites";

export function HomePage() {
  // Mês em foco: define qual mês os cards/lista/gráfico mostram. Pode ser
  // trocado pelo seletor de mês do cabeçalho ou clicando numa coluna do
  // gráfico "Economia nos últimos meses" (mesmo efeito).
  const [mes, setMes] = useState(mesAtualYYYYMM()); // "YYYY-MM"
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [renda, setRenda] = useState(0);
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Investimentos CDB: só os ATIVOS (dataResgate null) aparecem aqui.
  const [investimentos, setInvestimentos] = useState<InvestimentoCdb[]>([]);
  const [posicoesCdb, setPosicoesCdb] = useState<Record<number, PosicaoCdb>>({});

  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  // Últimos 6 meses de economia, para o card de destaque (variação vs mês
  // anterior) e o gráfico ao lado dele.
  const [historicoEconomia, setHistoricoEconomia] = useState<PontoEconomia[]>([]);

  // Controle de qual modal está aberto.
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalRenda, setModalRenda] = useState(false);
  const [modalInvestimento, setModalInvestimento] = useState(false);
  const [modalPlano, setModalPlano] = useState(false);
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

  // Busca tudo o que a home precisa para o mês em foco: categorias, despesas
  // do mês, renda do mês, investimentos CDB, objetivos e histórico de
  // economia dos últimos 6 meses terminando nele (para o card de destaque +
  // gráfico). Promise.all dispara em paralelo.
  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const inicio = primeiroDiaDoMes(mes);
      const fim = ultimoDiaDoMes(mes);
      const [cats, desps, tot, rds, invs, objs, historico] = await Promise.all([
        listarCategorias(),
        listarDespesas({ inicio, fim }),
        totalRenda(inicio), // mesReferencia = 1º dia do mês
        listarRendas(),
        listarInvestimentosCdb(),
        listarObjetivos(),
        compararMeses(primeiroDiaMesesAtrasDoMes(mes, 5), inicio),
      ]);
      setCategorias(cats);
      setDespesas(desps);
      setRenda(tot);
      setRendas(rds);
      // Só os ativos aparecem na home (os encerrados já viraram Renda do mês do resgate).
      setInvestimentos(invs.filter((i) => i.dataResgate === null));
      setObjetivos(objs);
      setHistoricoEconomia(
        historico.map((r) => ({
          rotulo: mesCurtoBR(r.mes),
          Economia: r.economia,
        })),
      );
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  // Recarrega na primeira carga e sempre que o mês em foco muda.
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  // Troca o mês em foco — usada tanto pelo seletor de mês quanto ao clicar
  // numa coluna do gráfico "Economia nos últimos meses" (mesmo efeito).
  function selecionarMes(novoMes: string) {
    setMes(novoMes);
  }

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

  // Variação da economia vs mês anterior, a partir do histórico dos últimos
  // meses (o último ponto é o mês atual, o penúltimo é o anterior).
  const economiaMesAnterior =
    historicoEconomia.length >= 2
      ? historicoEconomia[historicoEconomia.length - 2].Economia
      : null;
  const variacaoEconomia =
    economiaMesAnterior !== null && economiaMesAnterior !== 0
      ? ((economia - economiaMesAnterior) / Math.abs(economiaMesAnterior)) * 100
      : null;

  // 5 últimas por data (desc). [...] copia antes de ordenar (sort muta o array).
  const ultimasDespesas = [...despesas]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);

  // Plano de contenção: só faz sentido reduzir despesas se a renda FIXA sozinha
  // não bastaria para cobrir as despesas deste mês (ou seja, o mês só "fechou"
  // graças à renda variável). Se a renda fixa já cobre tudo, não há risco real
  // para o mês seguinte — a seção continua visível, mas sem sugestão de corte.
  const rendasDoMes = rendas.filter(
    (r) => r.mesReferencia === primeiroDiaDoMes(mes),
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
  const dificuldadePlano = dificuldadeContencao(plano);
  const corBotaoPlano = corEscalaDificuldade(dificuldadePlano);
  // Mês seguinte ao mês em foco (não necessariamente o mês seguinte ao
  // real): o plano de contenção projeta a partir do mês selecionado.
  const rotuloProximoMes = mesCurtoBR(`${mesSeguinteYYYYMM(mes)}-01`);

  // Chamado quando um modal salva com sucesso: fecha e recarrega os dados.
  function aoSalvar() {
    setModalDespesa(false);
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
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-grouper-ink lg:col-span-2">
          Início
        </h1>
        {/* Alinhado com a coluna direita (Economia do mês) logo abaixo: os
            botões começam onde aquele card começa, e o avatar fica na
            borda direita da página, como antes. O seletor de mês entra no
            espaço vazio que já existia ali (pl-44 -> pl-6 + w-36 do input +
            gap-2 = 24+144+8 = 176px = os mesmos 44*4px de antes), então
            "+ Adicionar renda" continua exatamente na mesma posição. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 pl-6">
            <input
              type="month"
              value={mes}
              onChange={(e) => selecionarMes(e.target.value)}
              // O navegador só abre o seletor nativo ao clicar no ícone do
              // calendário; showPicker() faz o clique em qualquer parte do
              // "botão" abrir o mesmo seletor.
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="w-36 cursor-pointer rounded-md border-2 border-grouper-mid bg-white px-3 py-2 font-display text-sm font-semibold text-grouper-ink shadow-sm transition-colors hover:bg-grouper-mist focus:outline-none focus:ring-2 focus:ring-grouper-mid"
            />
            <button
              onClick={() => setModalRenda(true)}
              className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-grouper-deep"
            >
              + Adicionar renda
            </button>
            <button
              onClick={() => setModalDespesa(true)}
              className="rounded-md bg-grouper-ink px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-black"
            >
              + Adicionar despesa
            </button>
          </div>
          {/* Placeholder do avatar do usuário — no futuro recebe a foto de perfil. */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grouper-ink font-display text-sm font-semibold text-white">
            <span className="sr-only">Perfil do usuário</span>
          </div>
        </div>
      </div>

      {/* Lembrete de início de mês: sugere redefinir os limites de gastos. */}
      {mostrarLembrete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-grouper-sky/50 bg-grouper-mist p-4">
          <p className="text-sm text-grouper-ink">
            O mês virou! Deseja redefinir seus limites de despesas?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                dispensarLembrete();
                navigate("/limites");
              }}
              className="rounded-md bg-grouper-mid px-4 py-2 text-sm font-medium text-white hover:bg-grouper-deep"
            >
              Sim, redefinir
            </button>
            <button
              onClick={dispensarLembrete}
              className="rounded-md px-4 py-2 text-sm font-medium text-grouper-navy hover:bg-white"
            >
              Agora não
            </button>
          </div>
        </div>
      )}

      {erro && (
        <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
          ⚠ {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-grouper-navy/60">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Coluna esquerda (mais larga): Renda/Despesas + Objetivos + Últimas despesas */}
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <StatCard titulo="Renda do mês" valor={renda} destaque="positivo" />
              <StatCard titulo="Despesas do mês" valor={totalDespesas} destaque="negativo" />
            </div>

            <ObjetivosResumoHome
              objetivos={objetivos}
              rendaFixaMensal={rendaFixaMes}
              onObjetivoCriado={carregar}
            />

            {/* Últimas despesas */}
            <section className="rounded-lg border border-grouper-sky/20 bg-white p-4 shadow-sm">
              <h2 className="mb-2 font-display text-lg font-semibold text-grouper-ink">
                Últimas despesas
              </h2>
              {ultimasDespesas.length === 0 ? (
                <p className="text-sm text-grouper-navy/60">
                  Nenhuma despesa lançada neste mês ainda.
                </p>
              ) : (
                <ul className="divide-y divide-grouper-sky/15">
                  {ultimasDespesas.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div>
                        <p className="text-grouper-ink">
                          {d.descricao}
                        </p>
                        <p className="text-xs text-grouper-navy/60">
                          {d.categoria.nome} · {rotuloTipoDespesa[d.tipo]} ·{" "}
                          {dataBR(d.data)}
                        </p>
                      </div>
                      <span className="text-grouper-ink">
                        {formatarBRL(d.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Coluna direita (mais estreita): Economia + gráfico + CDB + Plano de contenção */}
          <div className="space-y-4">
            <EconomiaDestaque valor={economia} renda={renda} variacaoPercentual={variacaoEconomia} />

            <section className="rounded-lg border border-grouper-sky/20 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-grouper-ink">
                  Economia nos últimos meses
                </h2>
                <button
                  onClick={() => setModalPlano(true)}
                  style={{
                    backgroundColor: corBotaoPlano.fundo,
                    color: corBotaoPlano.texto,
                  }}
                  className="rounded-md px-3 py-1.5 text-sm shadow-sm transition hover:brightness-95"
                >
                  Plano de contenção — {rotuloProximoMes}
                </button>
              </div>
              <GraficoEconomiaHome dados={historicoEconomia} />
            </section>

            {/* Investimento CDB: só o que dá pra calcular automaticamente.
                Só conta como renda no mês em que for resgatado. */}
            <section className="rounded-lg border border-grouper-sky/20 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-grouper-ink">
                  Investimento CDB
                </h2>
                <button
                  onClick={abrirNovoInvestimento}
                  className="rounded-md bg-grouper-deep px-3 py-1.5 text-sm text-white hover:bg-grouper-ink"
                >
                  + Novo investimento
                </button>
              </div>
              {investimentos.length === 0 ? (
                <p className="text-sm text-grouper-navy/60">
                  Nenhum investimento CDB ativo.
                </p>
              ) : (
                <>
                  {cdbSelecionados.size > 0 && (
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
                    </>
                  )}
                  <ul
                    className={`divide-y divide-grouper-sky/15 ${
                      investimentos.length > 2 ? "max-h-72 overflow-y-auto pr-1" : ""
                    }`}
                  >
                  {investimentos.map((inv) => {
                    const posicao = posicoesCdb[inv.id];
                    const selecionado = cdbSelecionados.has(inv.id);
                    return (
                      <li key={inv.id}>
                        <div
                          onClick={() => alternarCdb(inv.id)}
                          className={`cursor-pointer rounded-md px-3 py-3 transition-colors ${
                            selecionado ? "bg-grouper-sky/30" : "hover:bg-grouper-sky/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-display text-base text-grouper-ink">
                                {inv.descricao}
                              </p>
                              <span className="inline-block rounded-full bg-grouper-sky/30 px-2 py-0.5 text-xs font-medium text-grouper-deep">
                                {inv.percentualCdi}% do CDI
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="text-xs text-grouper-navy/60">
                                {dataBR(inv.dataAplicacao)}
                              </span>
                              {inv.objetivoId != null && (
                                <span
                                  title={`Vinculado ao objetivo "${inv.objetivoDescricao}"`}
                                  className="text-sm"
                                >
                                  🔗
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-1.5">
                            <span className="font-body text-lg text-grouper-deep">
                              {formatarBRL(posicao ? posicao.valorAtual : inv.valorAplicado)}
                            </span>
                          </div>

                          <div
                            className="mt-1.5 flex flex-wrap items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setInvestindoMaisEm(inv)}
                              className="rounded-md border border-grouper-deep/30 bg-white px-2 py-0.5 text-xs font-medium text-grouper-deep hover:bg-grouper-mist"
                            >
                              Investir mais
                            </button>
                            <button
                              onClick={() => setResgatando(inv)}
                              className="rounded-md border border-grouper-deep/30 bg-white px-2 py-0.5 text-xs font-medium text-grouper-deep hover:bg-grouper-mist"
                            >
                              Resgatar
                            </button>
                            <button
                              onClick={() => abrirEdicaoInvestimento(inv)}
                              aria-label="Editar"
                              title="Editar"
                              className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                            >
                              <IconeEditar className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => excluirInvestimento(inv)}
                              aria-label="Excluir"
                              title="Excluir"
                              className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                            >
                              <IconeExcluir className="h-3.5 w-3.5" />
                            </button>
                            {posicao && (
                              <span className="ml-auto text-xs font-medium text-grouper-mid">
                                Rendeu {formatarBRL(posicao.rendimentoBruto)}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  </ul>
                </>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Plano de contenção: agora é um pop-up aberto pelo botão ao lado do
          título "Economia nos últimos meses". Só mostra sugestão de corte
          quando a renda fixa sozinha não cobriria as despesas deste mês —
          ou seja, quando o mês só "fechou" com a ajuda da renda variável.
          Caso contrário, mostra que está tudo bem. */}
      <Modal
        titulo={`Plano de contenção — ${rotuloProximoMes}`}
        aberto={modalPlano}
        onClose={() => setModalPlano(false)}
      >
        <div className="space-y-3">
          {plano ? (
            <>
              {economia < 0 && (
                <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-xs text-grouper-ink">
                  ⚠ Atenção: mesmo com a ajuda da renda variável, este mês já
                  fechou no negativo (economia de {formatarBRL(economia)}).
                  Isso torna ainda mais urgente reduzir estas despesas.
                </p>
              )}
              <p className="text-sm text-grouper-navy">
                {rendaVariavelMes > 0
                  ? `Sua renda fixa (${formatarBRL(rendaFixaMes)}) não seria suficiente para cobrir as despesas deste mês (${formatarBRL(totalDespesas)}) sem a ajuda de ${formatarBRL(rendaVariavelMes)} em renda variável (freelas e retornos de investimento) — valores sem garantia de se repetir.`
                  : `As despesas deste mês (${formatarBRL(totalDespesas)}) já superam sua renda fixa (${formatarBRL(rendaFixaMes)}), mesmo sem nenhuma renda variável este mês.`}
              </p>
              <p className="text-sm text-grouper-ink">
                Para não fechar o próximo mês no negativo, considere reduzir
                estas despesas variáveis em{" "}
                {formatarBRL(plano.totalReducaoSugerida)}:
              </p>
              <ul className="divide-y divide-grouper-sky/15">
                {plano.categorias.map((c) => (
                  <li
                    key={c.nome}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-grouper-navy">
                      {c.nome}{" "}
                      <span className="text-grouper-navy/50">
                        ({formatarBRL(c.gastoAtual)})
                      </span>
                    </span>
                    <span className="font-medium text-grouper-ink">
                      -{formatarBRL(c.reducaoSugerida)} (
                      {c.percentualReducao.toFixed(0)}%)
                    </span>
                  </li>
                ))}
              </ul>
              {!plano.cobreQueda && (
                <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-xs text-grouper-ink">
                  ⚠ Mesmo reduzindo todas as despesas variáveis a
                  zero, ainda faltariam {formatarBRL(plano.faltante)} para
                  fechar o próximo mês só com a renda fixa. Vale revisar
                  despesas fixas ou buscar reforçar a renda fixa.
                </p>
              )}
            </>
          ) : (
            <p className="rounded-md border-l-4 border-grouper-mid bg-grouper-mist px-3 py-2 text-sm text-grouper-ink">
              ✓{" "}
              {rendaVariavelMes > 0
                ? `Este mês você teve ${formatarBRL(rendaVariavelMes)} em renda variável, mas sua renda fixa (${formatarBRL(rendaFixaMes)}) já cobre sozinha as despesas do mês (${formatarBRL(totalDespesas)}) — nada precisa ser reduzido.`
                : `Sua renda fixa (${formatarBRL(rendaFixaMes)}) cobre as despesas deste mês (${formatarBRL(totalDespesas)}) — nada precisa ser reduzido.`}
            </p>
          )}
        </div>
      </Modal>

      <NovaDespesaModal
        aberto={modalDespesa}
        onClose={() => setModalDespesa(false)}
        onCriada={aoSalvar}
        categorias={categorias}
      />
      <NovaRendaModal
        aberto={modalRenda}
        onClose={() => setModalRenda(false)}
        onCriada={aoSalvar}
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
