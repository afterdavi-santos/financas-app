import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovaRendaModal } from "../components/NovaRendaModal";
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
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
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
        TIPOS_EM_ORDEM.map((tipo) => {
          // Mais recentes primeiro (por mês de referência), só deste tipo.
          const doTipo = rendas
            .filter((r) => r.tipo === tipo)
            .sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia));
          if (doTipo.length === 0) return null;

          return (
            <section key={tipo} className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-500">
                {rotuloTipoRenda[tipo]}
              </h2>
              <ul className="divide-y divide-slate-100">
                {doTipo.map((renda) => (
                  <li
                    key={renda.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {renda.descricao}
                      </p>
                      <p className="text-xs text-slate-500">
                        {mesBR(renda.mesReferencia)}
                      </p>
                    </div>
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
        })
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
