import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovaDespesaModal } from "../components/NovaDespesaModal";
import { listarDespesas, excluirDespesa } from "../api/despesas";
import { listarCategorias } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoDespesa, dataBR } from "../utils/rotulos";
import { primeiroDiaDoMesISO, ultimoDiaDoMesISO } from "../utils/datas";
import type { Categoria, Despesa } from "../types/financas";

export function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Esta página lista as despesas do MÊS ATUAL (mesmo período da home).
  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const [desps, cats] = await Promise.all([
        listarDespesas({
          inicio: primeiroDiaDoMesISO(),
          fim: ultimoDiaDoMesISO(),
        }),
        listarCategorias(),
      ]);
      setDespesas(desps);
      setCategorias(cats);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function excluir(despesa: Despesa) {
    if (!confirm(`Excluir a despesa "${despesa.descricao}"?`)) return;
    try {
      await excluirDespesa(despesa.id);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  // Mais recentes primeiro (por data).
  const ordenadas = [...despesas].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader titulo="Despesas do mês">
        <button
          onClick={() => setModalAberto(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Adicionar despesa
        </button>
      </PageHeader>

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          {ordenadas.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma despesa lançada neste mês ainda.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ordenadas.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-800">{d.descricao}</p>
                    <p className="text-xs text-slate-500">
                      {d.categoria.nome} · {rotuloTipoDespesa[d.tipo]} ·{" "}
                      {dataBR(d.data)}
                    </p>
                  </div>
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
      )}

      <NovaDespesaModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        onCriada={() => {
          setModalAberto(false);
          carregar();
        }}
        categorias={categorias}
      />
    </div>
  );
}
