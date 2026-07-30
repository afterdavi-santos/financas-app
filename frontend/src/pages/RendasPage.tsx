import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovaRendaModal } from "../components/NovaRendaModal";
import { BarraSelecao } from "../components/BarraSelecao";
import { SelecionarTodos } from "../components/SelecionarTodos";
import { useSelecao } from "../hooks/useSelecao";
import { listarRendas, excluirRenda } from "../api/rendas";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoRenda, mesBR } from "../utils/rotulos";
import type { Renda, TipoRenda } from "../types/financas";

// Ordem fixa das seções (não depende da ordem em que os dados chegam).
const TIPOS_EM_ORDEM: TipoRenda[] = ["FIXA", "FREELA", "RETORNO_INVESTIMENTOS"];

export function RendasPage() {
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Renda em edição (null com modal aberto = criação de uma nova).
  const [editando, setEditando] = useState<Renda | null>(null);
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

  async function excluir(renda: Renda) {
    if (!confirm(`Excluir a renda "${renda.descricao}"?`)) return;
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader titulo="Rendas">
        <button
          onClick={abrirNova}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          + Adicionar renda
        </button>
      </PageHeader>

      <BarraSelecao
        quantidade={selecionados.size}
        texto={`${selecionados.size} renda${selecionados.size > 1 ? "s" : ""} selecionada${selecionados.size > 1 ? "s" : ""}`}
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
      ) : rendas.length === 0 ? (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Nenhuma renda cadastrada ainda.
          </p>
        </section>
      ) : (
        <>
          {TIPOS_EM_ORDEM.map((tipo) => {
          // Mais recentes primeiro (por mês de referência), só deste tipo.
          const doTipo = rendas
            .filter((r) => r.tipo === tipo)
            .sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia));
          if (doTipo.length === 0) return null;
          const idsDoTipo = doTipo.map((r) => r.id);

          return (
            <section key={tipo} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-500">
                  {rotuloTipoRenda[tipo]}
                </h2>
                <SelecionarTodos
                  marcado={todosSelecionados(idsDoTipo)}
                  onAlternar={() =>
                    todosSelecionados(idsDoTipo)
                      ? desselecionarTodos(idsDoTipo)
                      : selecionarTodos(idsDoTipo)
                  }
                />
              </div>
              <ul className="divide-y divide-slate-100">
                {doTipo.map((renda) => (
                  <li
                    key={renda.id}
                    className="flex items-center justify-between py-3"
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selecionados.has(renda.id)}
                        onChange={() => alternar(renda.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-slate-800">
                          {renda.descricao}
                        </p>
                        <p className="text-xs text-slate-500">
                          {mesBR(renda.mesReferencia)}
                        </p>
                      </div>
                    </label>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-green-700">
                        {formatarBRL(renda.valor)}
                      </span>
                      <button
                        onClick={() => abrirEdicao(renda)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(renda)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
          })}
        </>
      )}

      <NovaRendaModal
        aberto={modalAberto}
        renda={editando}
        onClose={() => setModalAberto(false)}
        onCriada={() => {
          setModalAberto(false);
          carregar();
        }}
      />
    </div>
  );
}
