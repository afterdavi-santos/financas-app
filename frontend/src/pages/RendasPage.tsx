import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "../components/PageHeader";
import { StatCard, TAMANHO_BASE_REM, TAMANHO_MINIMO_REM } from "../components/StatCard";
import { NovaRendaModal } from "../components/NovaRendaModal";
import { BarraSelecao } from "../components/BarraSelecao";
import { SelecionarTodos } from "../components/SelecionarTodos";
import { ConfirmacaoModal } from "../components/ConfirmacaoModal";
import { IconeEditar, IconeExcluir, IconeLupa } from "../components/IconesInvestimento";
import { Tooltip } from "../components/Tooltip";
import { GraficoRendaMensal, type PontoRenda } from "../components/GraficoRendaMensal";
import { SeletorMes } from "../components/SeletorMes";
import { useSelecao } from "../hooks/useSelecao";
import { useTelaEstreita } from "../hooks/useTelaEstreita";
import { useMesSelecionado } from "../hooks/useMesSelecionado";
import { useAjustarFonteSincronizada } from "../hooks/useAjustarFonteSincronizada";
import { listarRendas, excluirRenda } from "../api/rendas";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoRenda, mesBR, mesCurtoBR } from "../utils/rotulos";
import { mesAnteriorYYYYMM, primeiroDiaMesesAtrasDoMes } from "../utils/datas";
import { aoTeclarAtivar } from "../utils/teclado";
import { normalizarBusca } from "../utils/busca";
import type { Renda } from "../types/financas";

// Filtro da lista "Todas as rendas do mês" (canto direito do cabeçalho da
// seção). "Variáveis" agrupa FREELA + RETORNO_INVESTIMENTOS, igual ao
// StatCard "Renda variável" (não existe um único tipo "variável" no backend).
type FiltroTipo = "TODAS" | "FIXA" | "VARIAVEL";
const FILTROS: { chave: FiltroTipo; rotulo: string }[] = [
  { chave: "TODAS", rotulo: "Todas" },
  { chave: "FIXA", rotulo: "Fixas" },
  { chave: "VARIAVEL", rotulo: "Variáveis" },
];

interface Props {
  // Nó onde os controles do cabeçalho (mês + adicionar) são portados, pra
  // ficarem na mesma linha horizontal do seletor de aba (MovimentacoesPage).
  headerSlot?: HTMLDivElement | null;
  // Nó onde o gráfico de variação de renda é portado, pra aparecer na coluna
  // direita (MovimentacoesPage) em vez de dentro da coluna principal.
  graficoSlot?: HTMLDivElement | null;
}

export function RendasPage({ headerSlot, graficoSlot }: Props = {}) {
  const [rendas, setRendas] = useState<Renda[]>([]);
  // Mês em foco compartilhado com Início/Despesas (ver useMesSelecionado).
  const [mes, setMes] = useMesSelecionado(); // "YYYY-MM"
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Renda em edição (null com modal aberto = criação de uma nova).
  const [editando, setEditando] = useState<Renda | null>(null);
  // Filtro da lista completa por tipo (Todas/Fixas/Variáveis).
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("TODAS");
  // Busca por nome na lista completa (mesmo padrão da lista de despesas).
  // `buscaAberta` controla só a visibilidade do campo; o filtro é o `busca`.
  const [busca, setBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  // Só pro placeholder: o texto longo não cabe no campo estreito do mobile.
  const telaEstreita = useTelaEstreita();
  const {
    selecionados,
    alternar,
    limpar,
    selecionarTodos,
    desselecionarTodos,
    todosSelecionados,
  } = useSelecao();
  // Popup de confirmação de exclusão (substitui o confirm() nativo). null =
  // fechado; guarda a renda em questão para individual, ou "LOTE" para a
  // exclusão dos selecionados.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<Renda | "LOTE" | null>(null);

  function abrirNova() {
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(renda: Renda) {
    setEditando(renda);
    setModalAberto(true);
  }

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      // Janela dos 6 meses que terminam no mês em foco (ele incluso): é
      // exatamente o que a tela usa — o mês da lista e os mesmos 6 pontos do
      // gráfico "Variação de renda". Antes esta chamada trazia o histórico
      // inteiro e a tela filtrava no cliente.
      //
      // `fim` também faz o backend materializar as rendas fixas recorrentes até
      // o mês em foco — sem isso, avançar o seletor para um mês futuro mostrava
      // a lista vazia mesmo com salário fixo cadastrado.
      setRendas(
        await listarRendas({
          inicio: primeiroDiaMesesAtrasDoMes(mes, 5),
          fim: `${mes}-01`,
        }),
      );
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  // Recarrega na primeira carga e a cada troca de mês (o mês novo pode ainda
  // não ter as ocorrências fixas geradas).
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  // A API não filtra por mês (traz tudo), então o filtro é feito aqui.
  const rendasDoMes = useMemo(
    () => rendas.filter((r) => r.mesReferencia.slice(0, 7) === mes),
    [rendas, mes],
  );

  // Fixa = tipo FIXA. Variável agrupa freela + retorno de investimentos,
  // espelhando a divisão Fixas/Variáveis da tela de Despesas.
  const { totalFixa, totalExtra } = useMemo(() => {
    let totalFixa = 0;
    let totalExtra = 0;
    for (const r of rendasDoMes) {
      if (r.tipo === "FIXA") totalFixa += r.valor;
      else totalExtra += r.valor;
    }
    return { totalFixa, totalExtra };
  }, [rendasDoMes]);

  // Faz "Renda fixa" e "Renda variável" usarem sempre o mesmo tamanho de
  // fonte no valor (o menor dos dois que couber) — mesmo mecanismo de
  // DespesasPage.tsx.
  const refValorStatCard = useAjustarFonteSincronizada(
    [totalFixa, totalExtra],
    TAMANHO_BASE_REM,
    TAMANHO_MINIMO_REM,
  );

  // Histórico dos últimos 6 meses (a partir do mês em foco, ele incluso) para
  // o gráfico "Variação de renda" da coluna direita — `listarRendas()` já
  // traz tudo, então não precisa de nova chamada à API, só filtrar.
  const historicoRenda: PontoRenda[] = useMemo(() => {
    const meses: string[] = [];
    let atual = mes;
    for (let i = 0; i < 6; i++) {
      meses.unshift(atual);
      atual = mesAnteriorYYYYMM(atual);
    }
    return meses.map((m) => {
      let fixa = 0;
      let variavel = 0;
      for (const r of rendas) {
        if (r.mesReferencia.slice(0, 7) !== m) continue;
        if (r.tipo === "FIXA") fixa += r.valor;
        else variavel += r.valor;
      }
      return { rotulo: mesCurtoBR(`${m}-01`), Fixa: fixa, Variavel: variavel };
    });
  }, [rendas, mes]);

  // Mais recentes primeiro (por mês de referência), já filtradas pelo tipo
  // escolhido ("VARIAVEL" = FREELA + RETORNO_INVESTIMENTOS) e pelo texto
  // buscado (trecho em qualquer posição do nome, como um LIKE %texto%).
  const buscaNormalizada = normalizarBusca(busca);
  const ordenadas = rendasDoMes
    .filter(
      (r) =>
        filtroTipo === "TODAS" ||
        (filtroTipo === "FIXA" ? r.tipo === "FIXA" : r.tipo !== "FIXA"),
    )
    .filter(
      (r) => buscaNormalizada === "" || normalizarBusca(r.descricao).includes(buscaNormalizada),
    )
    .sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia));

  async function confirmarExclusao() {
    if (confirmandoExclusao === "LOTE") {
      const ids = Array.from(selecionados);
      const resultados = await Promise.allSettled(ids.map((id) => excluirRenda(id)));
      const falhas = resultados.filter((r) => r.status === "rejected").length;
      if (falhas > 0) {
        setErro(`${falhas} de ${ids.length} renda(s) não puderam ser excluídas.`);
      }
      limpar();
      carregar();
    } else if (confirmandoExclusao) {
      try {
        await excluirRenda(confirmandoExclusao.id);
        desselecionarTodos([confirmandoExclusao.id]);
        carregar();
      } catch (e) {
        setErro(mensagemDeErro(e));
      }
    }
    setConfirmandoExclusao(null);
  }

  // Troca o mês em foco — usada tanto pelo seletor de mês quanto ao clicar
  // numa coluna do gráfico "Variação de renda nos últimos meses" (mesmo
  // efeito).
  function selecionarMes(novoMes: string) {
    // Guarda defensiva — mês em foco não pode ficar vazio (quebraria os
    // cálculos do mês).
    if (!novoMes) return;
    limpar(); // seleção era da lista do mês anterior
    setMes(novoMes);
  }

  const controlesCabecalho = (
    <>
      <SeletorMes value={mes} onChange={selecionarMes} />
      <button
        onClick={abrirNova}
        className="w-full rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-grouper-deep lg:w-auto"
      >
        + Adicionar renda
      </button>
    </>
  );

  const graficoRenda = (
    <section className="rounded-lg border border-grouper-sky/20 bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-display text-lg font-semibold text-grouper-ink">
        Variação de renda nos últimos meses
      </h2>
      <GraficoRendaMensal dados={historicoRenda} />
    </section>
  );

  return (
    <div className="w-full space-y-6">
      {headerSlot ? (
        createPortal(controlesCabecalho, headerSlot)
      ) : (
        <PageHeader>{controlesCabecalho}</PageHeader>
      )}

      {graficoSlot && createPortal(graficoRenda, graficoSlot)}

      {erro && (
        <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
          ⚠ {erro}
        </p>
      )}

      {!carregando && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            titulo="Renda fixa"
            valor={totalFixa}
            destaque="positivo"
            valorRef={refValorStatCard(0)}
          />
          <StatCard
            titulo="Renda variável"
            valor={totalExtra}
            destaque="positivo"
            valorRef={refValorStatCard(1)}
          />
        </div>
      )}

      {carregando ? (
        <p className="text-grouper-navy/60">Carregando...</p>
      ) : (
        <section className="rounded-lg border border-grouper-sky/20 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-grouper-ink">
              Todas as rendas do mês
            </h2>
            {/* Filtro Todas/Fixas/Variáveis — mesmo tratamento de hover
                (azul mais escuro pra indicar que é clicável) das linhas
                de Investimento CDB na Home. */}
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {/* Lupa: alterna o campo de busca. Fechar limpa o texto, senão
                  a lista continuaria filtrada por um termo invisível. */}
              <button
                type="button"
                onClick={() => {
                  setBuscaAberta((aberta) => {
                    if (aberta) setBusca("");
                    return !aberta;
                  });
                }}
                aria-label="Pesquisar renda pelo nome"
                aria-pressed={buscaAberta}
                className={`rounded-md p-1.5 transition-colors ${
                  buscaAberta
                    ? "bg-grouper-sky/40 text-grouper-ink"
                    : "text-grouper-navy/60 hover:bg-grouper-sky/25 hover:text-grouper-ink"
                }`}
              >
                <IconeLupa className="h-4 w-4" />
              </button>
              {buscaAberta && (
                <input
                  type="text"
                  autoFocus
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setBusca("");
                      setBuscaAberta(false);
                    }
                  }}
                  placeholder={telaEstreita ? "Buscar" : "Buscar pelo nome..."}
                  className="w-24 min-w-0 rounded-md border border-grouper-sky/40 px-2 py-1 text-xs text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50 sm:w-40"
                />
              )}
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
                texto={`${selecionados.size} renda${selecionados.size > 1 ? "s" : ""} selecionada${selecionados.size > 1 ? "s" : ""}`}
                onExcluir={() => setConfirmandoExclusao("LOTE")}
                onCancelar={limpar}
              />
              <div className="my-3">
                <SelecionarTodos
                  marcado={todosSelecionados(ordenadas.map((r) => r.id))}
                  onAlternar={() =>
                    todosSelecionados(ordenadas.map((r) => r.id))
                      ? limpar()
                      : selecionarTodos(ordenadas.map((r) => r.id))
                  }
                />
              </div>
            </>
          )}

          {ordenadas.length === 0 ? (
            <p className="text-sm text-grouper-navy/60">
              {buscaNormalizada !== ""
                ? `Nenhuma renda deste mês com "${busca.trim()}" no nome.`
                : filtroTipo === "TODAS"
                  ? "Nenhuma renda lançada neste mês ainda."
                  : `Nenhuma renda ${filtroTipo === "FIXA" ? "fixa" : "variável"} neste mês.`}
            </p>
          ) : (
            <ul
              className={`divide-y divide-grouper-sky/45 ${
                ordenadas.length > 3 ? "max-h-49 overflow-y-auto pr-1" : ""
              }`}
            >
              {ordenadas.map((renda, indice) => {
                const selecionado = selecionados.has(renda.id);
                // No primeiro item não há espaço acima dentro da lista com
                // rolagem própria — o tooltip abre pra baixo (ver Tooltip.tsx).
                const vertical = indice === 0 ? "baixo" : "cima";
                return (
                  <li key={renda.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => alternar(renda.id)}
                      onKeyDown={aoTeclarAtivar(() => alternar(renda.id))}
                      className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-grouper-mid ${
                        selecionado ? "bg-grouper-sky/30" : "hover:bg-grouper-sky/20"
                      }`}
                    >
                      <div>
                        <p className="text-grouper-ink">
                          {renda.descricao}
                        </p>
                        <p className="text-xs font-medium text-grouper-deep">
                          {rotuloTipoRenda[renda.tipo]} · {mesBR(renda.mesReferencia)}
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-semibold text-grouper-deep">
                          {formatarBRL(renda.valor)}
                        </span>
                        <Tooltip texto="Editar" posicao="direita" vertical={vertical}>
                          <button
                            onClick={() => abrirEdicao(renda)}
                            aria-label="Editar"
                            className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                          >
                            <IconeEditar className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip texto="Excluir" posicao="direita" vertical={vertical}>
                          <button
                            onClick={() => setConfirmandoExclusao(renda)}
                            aria-label="Excluir"
                            className="rounded-md border border-red-300 bg-white p-1 text-red-600 hover:bg-red-50"
                          >
                            <IconeExcluir className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <NovaRendaModal
        aberto={modalAberto}
        renda={editando}
        mesPadrao={mes}
        onClose={() => setModalAberto(false)}
        onCriada={() => {
          setModalAberto(false);
          carregar();
        }}
      />

      <ConfirmacaoModal
        aberto={confirmandoExclusao !== null}
        titulo={confirmandoExclusao === "LOTE" ? "Excluir rendas" : "Excluir renda"}
        mensagem={
          confirmandoExclusao === "LOTE"
            ? `Excluir ${selecionados.size} renda${selecionados.size > 1 ? "s" : ""} selecionada${selecionados.size > 1 ? "s" : ""}?`
            : confirmandoExclusao?.recorrente
              ? `A renda "${confirmandoExclusao.descricao}" é fixa. Excluí-la removerá do mês atual e dos meses seguintes. Obs: não afetará os meses anteriores.

Deseja continuar?`
              : `Excluir a renda "${confirmandoExclusao?.descricao}"?`
        }
        onConfirmar={confirmarExclusao}
        onClose={() => setConfirmandoExclusao(null)}
      />
    </div>
  );
}
