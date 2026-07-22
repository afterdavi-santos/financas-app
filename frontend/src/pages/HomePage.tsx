import { useEffect, useState } from "react";
import { StatCard } from "../components/StatCard";
import { NovaDespesaModal } from "../components/NovaDespesaModal";
import { NovaCategoriaModal } from "../components/NovaCategoriaModal";
import { listarCategorias } from "../api/categorias";
import { listarDespesas } from "../api/despesas";
import { totalRenda } from "../api/rendas";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import {
  primeiroDiaDoMesISO,
  ultimoDiaDoMesISO,
} from "../utils/datas";
import type { Categoria, Despesa } from "../types/financas";

// Traduz o enum do backend para um rótulo amigável.
const rotuloTipo: Record<Despesa["tipo"], string> = {
  FIXA: "Fixa",
  EXTRAORDINARIA: "Extraordinária",
};

export function HomePage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [renda, setRenda] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Controle de qual modal está aberto.
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);

  // Busca tudo o que a home precisa: categorias, despesas do mês e renda do mês.
  // Promise.all dispara as 3 chamadas em paralelo (mais rápido que em sequência).
  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const inicio = primeiroDiaDoMesISO();
      const fim = ultimoDiaDoMesISO();
      const [cats, desps, tot] = await Promise.all([
        listarCategorias(),
        listarDespesas({ inicio, fim }),
        totalRenda(inicio), // mesReferencia = 1º dia do mês
      ]);
      setCategorias(cats);
      setDespesas(desps);
      setRenda(tot);
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
    carregar();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Início</h1>
        <div className="flex gap-2">
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
        </div>
      </div>

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
                        {d.categoria.nome} · {rotuloTipo[d.tipo]} ·{" "}
                        {d.data.split("-").reverse().join("/")}
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
    </div>
  );
}
