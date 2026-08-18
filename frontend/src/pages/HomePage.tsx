import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NovaDespesaModal } from "../components/NovaDespesaModal";
import { NovaRendaModal } from "../components/NovaRendaModal";
import { LeitorFaturaModal } from "../components/LeitorFaturaModal";
import { NovoInvestimentoCdbModal } from "../components/NovoInvestimentoCdbModal";
import { ExcluirInvestimentoModal } from "../components/ExcluirInvestimentoModal";
import { ConfirmacaoModal } from "../components/ConfirmacaoModal";
import { ResgatarCdbModal } from "../components/ResgatarCdbModal";
import { InvestirMaisModal } from "../components/InvestirMaisModal";
import { BarraSelecao } from "../components/BarraSelecao";
import { SelecionarTodos } from "../components/SelecionarTodos";
import { IconeEditar, IconeExcluir } from "../components/IconesInvestimento";
import { Tooltip } from "../components/Tooltip";
import { Modal } from "../components/Modal";
import { StatCard } from "../components/StatCard";
import { EconomiaDestaque } from "../components/EconomiaDestaque";
import { GraficoEconomiaHome, type PontoEconomia } from "../components/GraficoEconomiaHome";
import { ObjetivosResumoHome } from "../components/ObjetivosResumoHome";
import { Avatar } from "../components/Avatar";
import { SeletorMes } from "../components/SeletorMes";
import { useSelecao } from "../hooks/useSelecao";
import { useMesSelecionado } from "../hooks/useMesSelecionado";
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
import { rotuloTipoCategoria, dataBR, mesCurtoBR } from "../utils/rotulos";
import {
  hojeISO,
  mesAtualYYYYMM,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
  mesSeguinteYYYYMM,
  primeiroDiaMesesAtrasDoMes,
} from "../utils/datas";
import { planoContencao } from "../utils/contencaoRendaVariavel";
import { corEscalaEconomiaBotao } from "../utils/cores";
import { aoTeclarAtivar } from "../utils/teclado";
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
  // Mês em foco compartilhado com Despesas/Rendas (ver useMesSelecionado).
  const [mes, setMes] = useMesSelecionado(); // "YYYY-MM"
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

  // Aba selecionada no seletor mobile (Renda/Despesas/Economia do mês) —
  // só usada abaixo de `lg`, onde os 3 cards viram abas pra economizar
  // espaço vertical (ver JSX). Em lg+ os 3 continuam sempre visíveis.
  const [abaResumoMobile, setAbaResumoMobile] = useState<
    "renda" | "despesas" | "economia"
  >("renda");

  // Controle de qual modal está aberto.
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalRenda, setModalRenda] = useState(false);
  const [modalLeitorFatura, setModalLeitorFatura] = useState(false);
  const [modalInvestimento, setModalInvestimento] = useState(false);
  const [modalPlano, setModalPlano] = useState(false);
  const [editandoInvestimento, setEditandoInvestimento] = useState<InvestimentoCdb | null>(null);
  const [excluindoInvestimento, setExcluindoInvestimento] = useState<InvestimentoCdb | null>(null);
  const [confirmandoLoteCdb, setConfirmandoLoteCdb] = useState(false);
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
        // A Home só usa `rendasDoMes`, então pede só o mês em foco. `fim` também
        // é até onde o backend materializa as fixas.
        listarRendas({ inicio, fim: inicio }),
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
    // Guarda defensiva — mês em foco não pode ficar vazio (quebraria os
    // cálculos do mês).
    if (!novoMes) return;
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

  // Data padrão do modal de nova despesa: hoje, se o mês em foco for o mês
  // atual; senão o dia 1 do mês em foco — mesmo padrão de DespesasPage, pra
  // já abrir o modal apontando pro mês que está sendo visto, não sempre hoje.
  const dataPadraoNovaDespesa =
    mes === mesAtualYYYYMM() ? hojeISO() : primeiroDiaDoMes(mes);

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

  // Plano de contenção: a meta não é mais só "não fechar negativo" (economia
  // = 0 em relação à renda fixa), e sim fechar com pelo menos 10% de folga
  // sobre a renda fixa — ou seja, despesas <= 90% da renda fixa. Se a renda
  // fixa já cobre as despesas com essa folga, não há risco real pro mês
  // seguinte — a seção continua visível, mas sem sugestão de corte.
  const MARGEM_FOLGA_RENDA_FIXA = 0.1;
  const rendasDoMes = rendas.filter(
    (r) => r.mesReferencia === primeiroDiaDoMes(mes),
  );
  const rendaFixaMes = rendasDoMes
    .filter((r) => r.tipo === "FIXA")
    .reduce((soma, r) => soma + r.valor, 0);
  const rendaVariavelMes = rendasDoMes
    .filter((r) => r.tipo === "FREELA" || r.tipo === "RETORNO_INVESTIMENTOS")
    .reduce((soma, r) => soma + r.valor, 0);
  const valorNecessarioReduzir = Math.max(
    0,
    totalDespesas - rendaFixaMes * (1 - MARGEM_FOLGA_RENDA_FIXA),
  );
  const despesasExtraordinarias = despesas.filter(
    (d) => d.tipo === "VARIAVEL",
  );
  const plano = planoContencao(despesasExtraordinarias, valorNecessarioReduzir);
  // Cor do botão baseada na economia do mês em si (mesma escala da borda do
  // card "Economia do mês"), não mais em "% da categoria selecionada a
  // cortar" — ver `corEscalaEconomiaBotao`.
  const percentualEconomia = renda > 0 ? Math.max(0, Math.min(100, (economia / renda) * 100)) : 0;
  const corBotaoPlano = corEscalaEconomiaBotao(percentualEconomia);
  // Mês seguinte ao mês em foco (não necessariamente o mês seguinte ao
  // real): o plano de contenção projeta a partir do mês selecionado.
  const rotuloProximoMes = mesCurtoBR(`${mesSeguinteYYYYMM(mes)}-01`);

  // Chamado quando um modal salva com sucesso: fecha e recarrega os dados.
  function aoSalvar() {
    setModalDespesa(false);
    setModalRenda(false);
    carregar();
  }

  function aoImportarFatura() {
    setModalLeitorFatura(false);
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

  function excluirInvestimento(investimento: InvestimentoCdb) {
    setExcluindoInvestimento(investimento);
  }

  async function excluirInvestimentosSelecionados() {
    const ids = Array.from(cdbSelecionados);
    const resultados = await Promise.allSettled(ids.map((id) => excluirInvestimentoCdb(id)));
    const falhas = resultados.filter((r) => r.status === "rejected").length;
    if (falhas > 0) {
      setErro(`${falhas} de ${ids.length} investimento(s) não puderam ser excluídos.`);
    }
    limparCdb();
    carregar();
    setConfirmandoLoteCdb(false);
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="order-1 font-display text-3xl font-semibold tracking-tight text-grouper-ink lg:order-none">
          Visão geral
        </h1>
        {/* No mobile, o avatar (order-2) fica ao lado do título (order-1),
            e os botões (order-3) empilham abaixo — por isso este wrapper
            vira `contents` abaixo de `lg`, "achatando" os filhos pra serem
            itens diretos do flex de fora, onde o `order` de cada um se
            aplica. Em `lg`+ ele volta a ser um flex de verdade e todo mundo
            reseta pra `order-none`, restaurando a posição original (avatar
            sempre por último, colado aos botões). */}
        <div className="contents lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
          <div className="order-3 w-full lg:order-none lg:w-auto">
            <SeletorMes value={mes} onChange={selecionarMes} />
          </div>
          <button
            onClick={() => setModalLeitorFatura(true)}
            className="order-3 w-full rounded-md bg-grouper-deep px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-grouper-ink lg:order-none lg:w-auto"
          >
            Leitor de fatura
          </button>
          <button
            onClick={() => setModalRenda(true)}
            className="order-3 w-full rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-grouper-deep lg:order-none lg:w-auto"
          >
            + Adicionar renda
          </button>
          <button
            onClick={() => setModalDespesa(true)}
            className="order-3 w-full rounded-md bg-grouper-ink px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-black lg:order-none lg:w-auto"
          >
            + Adicionar despesa
          </button>
          <div className="order-2 lg:order-none lg:contents">
            <Avatar menu />
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
                navigate("/planejamento");
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
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
          {/* Seletor de 3 abas (Renda/Despesas/Economia do mês) — só existe
              abaixo de `lg`, no lugar dos cards separados (ver abaixo),
              pra economizar espaço vertical numa tela estreita. Primeiro
              bloco a aparecer no mobile. */}
          <div className="order-1 lg:hidden">
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-grouper-sky/20 bg-white p-1 shadow-sm">
              {(
                [
                  { chave: "renda", rotulo: "Renda" },
                  { chave: "despesas", rotulo: "Despesas" },
                  { chave: "economia", rotulo: "Economia" },
                ] as const
              ).map((aba) => (
                <button
                  key={aba.chave}
                  onClick={() => setAbaResumoMobile(aba.chave)}
                  className={`rounded-md py-2 font-display text-xs font-semibold transition-colors ${
                    abaResumoMobile === aba.chave
                      ? "bg-grouper-mid text-white"
                      : "text-grouper-navy/70 hover:bg-grouper-mist"
                  }`}
                >
                  {aba.rotulo}
                </button>
              ))}
            </div>
            <div className="mt-3">
              {abaResumoMobile === "renda" && (
                <StatCard titulo="Renda do mês" valor={renda} destaque="positivo" />
              )}
              {abaResumoMobile === "despesas" && (
                <StatCard titulo="Despesas do mês" valor={totalDespesas} destaque="negativo" />
              )}
              {abaResumoMobile === "economia" && (
                <EconomiaDestaque
                  valor={economia}
                  renda={renda}
                  variacaoPercentual={variacaoEconomia}
                />
              )}
            </div>
          </div>

          {/* Coluna esquerda (mais larga) em lg+: Renda/Despesas + Objetivos +
              Últimas despesas. Abaixo de lg esse wrapper vira `contents`
              (some da árvore de layout) e os 3 blocos de dentro passam a
              competir livremente com os da coluna direita pela ordem
              definida em `order-*` — por isso Objetivos/Últimas despesas
              têm `order` mesmo "dentro" desta div: em lg+ o `order` não
              tem efeito nenhum (a div volta a ser um bloco normal, não um
              item de flex/grid), só entra em jogo no modo `contents`. */}
          <div className="contents lg:col-span-2 lg:block lg:space-y-4">
            {/* Desktop: os 2 StatCards lado a lado, como sempre foi — no
                mobile quem cobre isso é o seletor de abas acima. */}
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
              <StatCard titulo="Renda do mês" valor={renda} destaque="positivo" />
              <StatCard titulo="Despesas do mês" valor={totalDespesas} destaque="negativo" />
            </div>

            <div className="order-2">
              <ObjetivosResumoHome
                objetivos={objetivos}
                rendaFixaMensal={rendaFixaMes}
                onObjetivoCriado={carregar}
                onErro={(mensagem) => setErro(mensagem)}
              />
            </div>

            {/* Últimas despesas */}
            <section className="order-3 rounded-lg border border-grouper-sky/20 bg-white p-5 shadow-sm">
              <h2 className="mb-2 font-display text-lg font-semibold text-grouper-ink">
                Últimas despesas
              </h2>
              {ultimasDespesas.length === 0 ? (
                <p className="text-sm text-grouper-navy/60">
                  Nenhuma despesa lançada neste mês ainda.
                </p>
              ) : (
                <ul className="divide-y divide-grouper-sky/45">
                  {ultimasDespesas.map((d) => (
                    <li key={d.id}>
                      <div className="flex items-center justify-between rounded-md px-3 py-1.5">
                        <div>
                          <p className="text-grouper-ink">
                            {d.descricao}
                          </p>
                          <p className="text-xs font-medium text-grouper-deep">
                            {d.categoria.nome} · {rotuloTipoCategoria[d.tipo]} ·{" "}
                            {dataBR(d.data)}
                          </p>
                        </div>
                        <span className="text-grouper-ink">
                          {formatarBRL(d.valor)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Coluna direita (mais estreita) em lg+: Economia + gráfico + CDB.
              Mesmo esquema de `contents` da coluna esquerda acima. */}
          <div className="contents lg:block lg:space-y-4">
            {/* Desktop: card de Economia do mês — no mobile quem cobre isso
                é a aba "Economia" do seletor lá em cima. */}
            <div className="hidden lg:block">
              <EconomiaDestaque
                valor={economia}
                renda={renda}
                variacaoPercentual={variacaoEconomia}
              />
            </div>

            {/* "Economia nos últimos meses": fica ANTES do CDB no DOM (pra
                manter a ordem visual de sempre em lg+, onde `order` não
                tem efeito), mas com `order-5` — o maior de todos — pra
                aparecer por último no mobile, depois do CDB (`order-4`). */}
            <section className="order-5 rounded-lg border border-grouper-sky/20 bg-white p-4 shadow-sm">
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
                  className="rounded-md px-3 py-1.5 font-display text-[13px] shadow-sm transition hover:brightness-95"
                >
                  Plano de contenção — {rotuloProximoMes}
                </button>
              </div>
              <GraficoEconomiaHome dados={historicoEconomia} />
            </section>

            {/* Investimento CDB: só o que dá pra calcular automaticamente.
                Só conta como renda no mês em que for resgatado. Aparece
                antes do gráfico no mobile (`order-4` < `order-5` acima);
                em lg+ mantém a posição de sempre (depois do gráfico, por
                estar depois dele no DOM). */}
            <section className="order-4 rounded-lg border border-grouper-sky/20 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-grouper-ink">
                  Investimento CDB
                </h2>
                <button
                  onClick={abrirNovoInvestimento}
                  className="rounded-md bg-grouper-deep px-3 py-1.5 font-display text-[13px] text-white hover:bg-grouper-ink"
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
                        onExcluir={() => setConfirmandoLoteCdb(true)}
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
                    className={`divide-y divide-grouper-sky/45 ${
                      investimentos.length > 2 ? "max-h-72 overflow-y-auto pr-1" : ""
                    }`}
                  >
                  {investimentos.map((inv, indice) => {
                    const posicao = posicoesCdb[inv.id];
                    const selecionado = cdbSelecionados.has(inv.id);
                    // No primeiro item não há espaço acima dentro da lista
                    // com rolagem própria — o tooltip abre pra baixo (ver
                    // Tooltip.tsx).
                    const vertical = indice === 0 ? "baixo" : "cima";
                    return (
                      <li key={inv.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => alternarCdb(inv.id)}
                          onKeyDown={aoTeclarAtivar(() => alternarCdb(inv.id))}
                          className={`cursor-pointer rounded-md px-3 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-grouper-mid ${
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
                              <span className="text-xs font-medium text-grouper-deep">
                                {dataBR(inv.dataAplicacao)}
                              </span>
                              {inv.objetivoId != null && (
                                <Tooltip texto={`Vinculado ao objetivo "${inv.objetivoDescricao}"`} posicao="direita">
                                  <span className="text-sm">🔗</span>
                                </Tooltip>
                              )}
                            </div>
                          </div>

                          <div className="mt-1.5">
                            <span className="font-body text-lg text-grouper-deep">
                              {formatarBRL(posicao ? posicao.valorAtual : inv.valorAplicado)}
                            </span>
                          </div>

                          {/* Dias úteis normalmente ficam perto de ~69-70% dos dias
                              corridos (5 de 7 dias da semana); bem abaixo disso
                              indica que o histórico de CDI usado no cálculo está
                              incompleto (ex.: backfill do Banco Central ainda não
                              terminou) — o rendimento mostrado pode estar
                              subestimado até o próximo carregamento. */}
                          {posicao && posicao.diasCorridos > 30 &&
                            posicao.diasUteisRendidos < posicao.diasCorridos * 0.5 && (
                              <p className="mt-1 text-xs text-amber-700">
                                ⚠ Dados de CDI incompletos para o período ({posicao.diasUteisRendidos} de{" "}
                                {posicao.diasCorridos} dias considerados) — o rendimento pode estar
                                subestimado. Tente recarregar em alguns minutos.
                              </p>
                            )}

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
                            <Tooltip texto="Editar" posicao="direita" vertical={vertical}>
                              <button
                                onClick={() => abrirEdicaoInvestimento(inv)}
                                aria-label="Editar"
                                className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                              >
                                <IconeEditar className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip texto="Excluir" posicao="direita" vertical={vertical}>
                              <button
                                onClick={() => excluirInvestimento(inv)}
                                aria-label="Excluir"
                                className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                              >
                                <IconeExcluir className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
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
              <p className="text-sm font-semibold text-grouper-ink">
                {rendaVariavelMes > 0
                  ? `Sua renda fixa (${formatarBRL(rendaFixaMes)}) não seria suficiente para cobrir as despesas deste mês (${formatarBRL(totalDespesas)}) sem a ajuda de ${formatarBRL(rendaVariavelMes)} em renda variável. `
                  : `As despesas deste mês (${formatarBRL(totalDespesas)}) já superam sua renda fixa (${formatarBRL(rendaFixaMes)}). `}
                Para não fechar o próximo mês no negativo e conseguir guardar
                ao menos 10% da sua renda fixa, considere seguir este plano
                de contenção:
              </p>
              <ul className="space-y-2">
                {plano.categorias.map((c) => (
                  <li
                    key={c.nome}
                    className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-grouper-red bg-white px-3 py-2.5 shadow-sm"
                  >
                    <span className="text-sm text-grouper-navy">
                      {c.nome}{" "}
                      <span className="text-grouper-navy/50">
                        ({formatarBRL(c.gastoAtual)})
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-base font-semibold text-grouper-red">
                        -{formatarBRL(c.reducaoSugerida)}
                      </span>
                      <span className="text-xs font-medium text-grouper-navy/60">
                        {c.percentualReducao.toFixed(0)}% da categoria
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {!plano.cobreQueda && (
                <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
                  ⚠ Mesmo reduzindo todas as despesas variáveis a
                  zero, ainda faltariam {formatarBRL(plano.faltante)} para
                  fechar o próximo mês só com a renda fixa. Vale revisar
                  despesas fixas ou buscar reforçar a renda fixa.
                </p>
              )}
            </>
          ) : (
            <p className="rounded-md border-l-4 border-grouper-mid bg-grouper-mist px-3 py-2 text-base text-grouper-ink">
              ✓{" "}
              {`Sua renda fixa (${formatarBRL(rendaFixaMes)}) cobre as despesas deste mês (${formatarBRL(totalDespesas)}) — nada precisa ser reduzido.`}
            </p>
          )}
        </div>
      </Modal>

      <NovaDespesaModal
        aberto={modalDespesa}
        onClose={() => setModalDespesa(false)}
        onCriada={aoSalvar}
        categorias={categorias}
        dataPadrao={dataPadraoNovaDespesa}
      />
      <NovaRendaModal
        aberto={modalRenda}
        onClose={() => setModalRenda(false)}
        onCriada={aoSalvar}
        mesPadrao={mes}
      />
      <LeitorFaturaModal
        aberto={modalLeitorFatura}
        onClose={() => setModalLeitorFatura(false)}
        categorias={categorias}
        onImportado={aoImportarFatura}
        mes={mes}
      />
      <NovoInvestimentoCdbModal
        aberto={modalInvestimento}
        investimento={editandoInvestimento}
        objetivos={objetivos}
        onClose={() => setModalInvestimento(false)}
        onSalvo={() => {
          setModalInvestimento(false);
          carregar();
        }}
      />
      <ExcluirInvestimentoModal
        investimento={excluindoInvestimento}
        onClose={() => setExcluindoInvestimento(null)}
        onExcluido={() => {
          if (excluindoInvestimento) desselecionarTodosCdb([excluindoInvestimento.id]);
          setExcluindoInvestimento(null);
          carregar();
        }}
      />
      <ConfirmacaoModal
        aberto={confirmandoLoteCdb}
        titulo="Excluir investimentos"
        mensagem={`Excluir ${cdbSelecionados.size} investimento${cdbSelecionados.size > 1 ? "s" : ""} selecionado${cdbSelecionados.size > 1 ? "s" : ""}?`}
        onConfirmar={excluirInvestimentosSelecionados}
        onClose={() => setConfirmandoLoteCdb(false)}
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
