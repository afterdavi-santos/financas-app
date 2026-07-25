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
import { listarCategorias } from "../api/categorias";
import { listarDespesas } from "../api/despesas";
import { totalRenda } from "../api/rendas";
import {
  listarInvestimentosCdb,
  posicaoInvestimentoCdb,
  excluirInvestimentoCdb,
} from "../api/investimentosCdb";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoDespesa, dataBR } from "../utils/rotulos";
import { mesAtualYYYYMM, primeiroDiaDoMesISO, ultimoDiaDoMesISO } from "../utils/datas";
import type { Categoria, Despesa, InvestimentoCdb, PosicaoCdb } from "../types/financas";

// Guardamos no localStorage o último mês em que o usuário já viu o lembrete de
// redefinir limites, para mostrá-lo uma vez por mês (ao entrar no mês novo).
const CHAVE_LEMBRETE = "financas.lembreteLimites";

export function HomePage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [renda, setRenda] = useState(0);
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
      const [cats, desps, tot, invs] = await Promise.all([
        listarCategorias(),
        listarDespesas({ inicio, fim }),
        totalRenda(inicio), // mesReferencia = 1º dia do mês
        listarInvestimentosCdb(),
      ]);
      setCategorias(cats);
      setDespesas(desps);
      setRenda(tot);
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
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
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
              <ul className="divide-y divide-slate-100">
                {investimentos.map((inv) => {
                  const posicao = posicoesCdb[inv.id];
                  return (
                    <li key={inv.id} className="py-3">
                      <div className="flex items-center justify-between gap-2">
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
