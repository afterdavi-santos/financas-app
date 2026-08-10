import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { NovaRendaModal } from "../components/NovaRendaModal";
import { BarraSelecao } from "../components/BarraSelecao";
import { SelecionarTodos } from "../components/SelecionarTodos";
import { IconeEditar, IconeExcluir } from "../components/IconesInvestimento";
import { GraficoRendaMensal, type PontoRenda } from "../components/GraficoRendaMensal";
import { useSelecao } from "../hooks/useSelecao";
import { listarRendas, excluirRenda } from "../api/rendas";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoRenda, mesBR, mesCurtoBR } from "../utils/rotulos";
import { mesAtualYYYYMM, mesAnteriorYYYYMM } from "../utils/datas";
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
  const [mes, setMes] = useState(mesAtualYYYYMM()); // "YYYY-MM"
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Renda em edição (null com modal aberto = criação de uma nova).
  const [editando, setEditando] = useState<Renda | null>(null);
  // Filtro da lista completa por tipo (Todas/Fixas/Variáveis).
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("TODAS");
  const {
    selecionados,
    alternar,
    limpar,
    selecionarTodos,
    desselecionarTodos,
    todosSelecionados,
  } = useSelecao();

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
      setRendas(await listarRendas());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

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
  // escolhido ("VARIAVEL" = FREELA + RETORNO_INVESTIMENTOS).
  const ordenadas = rendasDoMes
    .filter(
      (r) =>
        filtroTipo === "TODAS" ||
        (filtroTipo === "FIXA" ? r.tipo === "FIXA" : r.tipo !== "FIXA"),
    )
    .sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia));

  async function excluir(renda: Renda) {
    const mensagem = renda.recorrente
      ? `A renda "${renda.descricao}" é fixa e recorrente. Excluí-la remove só o mês atual e para as próximas repetições — os meses anteriores continuam registrados. Continuar?`
      : `Excluir a renda "${renda.descricao}"?`;
    if (!confirm(mensagem)) return;
    try {
      await excluirRenda(renda.id);
      desselecionarTodos([renda.id]);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function excluirSelecionadas() {
    const ids = Array.from(selecionados);
    const plural = ids.length > 1;
    if (!confirm(`Excluir ${ids.length} renda${plural ? "s" : ""} selecionada${plural ? "s" : ""}?`)) return;
    const resultados = await Promise.allSettled(ids.map((id) => excluirRenda(id)));
    const falhas = resultados.filter((r) => r.status === "rejected").length;
    if (falhas > 0) {
      setErro(`${falhas} de ${ids.length} renda(s) não puderam ser excluídas.`);
    }
    limpar();
    carregar();
  }

  // Troca o mês em foco — usada tanto pelo seletor de mês quanto ao clicar
  // numa coluna do gráfico "Variação de renda nos últimos meses" (mesmo
  // efeito).
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
          <StatCard titulo="Renda fixa" valor={totalFixa} destaque="positivo" />
          <StatCard
            titulo="Renda variável"
            valor={totalExtra}
            destaque="positivo"
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
                texto={`${selecionados.size} renda${selecionados.size > 1 ? "s" : ""} selecionada${selecionados.size > 1 ? "s" : ""}`}
                onExcluir={excluirSelecionadas}
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
              {filtroTipo === "TODAS"
                ? "Nenhuma renda lançada neste mês ainda."
                : `Nenhuma renda ${filtroTipo === "FIXA" ? "fixa" : "variável"} neste mês.`}
            </p>
          ) : (
            <ul
              className={`divide-y divide-grouper-sky/45 ${
                ordenadas.length > 3 ? "max-h-49 overflow-y-auto pr-1" : ""
              }`}
            >
              {ordenadas.map((renda) => {
                const selecionado = selecionados.has(renda.id);
                return (
                  <li key={renda.id}>
                    <div
                      onClick={() => alternar(renda.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-3 transition-colors ${
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
                        <button
                          onClick={() => abrirEdicao(renda)}
                          aria-label="Editar"
                          title="Editar"
                          className="rounded-md border border-grouper-mid/30 bg-white p-1 text-grouper-mid hover:bg-grouper-mist"
                        >
                          <IconeEditar className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => excluir(renda)}
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
    </div>
  );
}
