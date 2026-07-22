import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovaRendaModal } from "../components/NovaRendaModal";
import { listarRendas, excluirRenda } from "../api/rendas";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { rotuloTipoRenda, mesBR } from "../utils/rotulos";
import type { Renda } from "../types/financas";

export function RendasPage() {
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

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
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  // Mais recentes primeiro (por mês de referência).
  const ordenadas = [...rendas].sort((a, b) =>
    b.mesReferencia.localeCompare(a.mesReferencia),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader titulo="Rendas">
        <button
          onClick={() => setModalAberto(true)}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          + Adicionar renda
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
              Nenhuma renda cadastrada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ordenadas.map((renda) => (
                <li
                  key={renda.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {renda.descricao}
                    </p>
                    <p className="text-xs text-slate-500">
                      {rotuloTipoRenda[renda.tipo]} · {mesBR(renda.mesReferencia)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-green-700">
                      {formatarBRL(renda.valor)}
                    </span>
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
          )}
        </section>
      )}

      <NovaRendaModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        onCriada={() => {
          setModalAberto(false);
          carregar();
        }}
      />
    </div>
  );
}
