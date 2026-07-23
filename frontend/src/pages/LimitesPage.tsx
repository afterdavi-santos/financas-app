import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovoLimiteModal } from "../components/NovoLimiteModal";
import { listarCategorias } from "../api/categorias";
import { listarLimites, statusLimite, excluirLimite } from "../api/limites";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { primeiroDiaDoMesISO } from "../utils/datas";
import type { Categoria, LimiteCategoria, StatusLimite } from "../types/financas";

// Cada linha junta o teto (limite) com quanto já foi gasto no mês (status).
interface Linha {
  limite: LimiteCategoria;
  status: StatusLimite;
}

// "2026-07-01" -> "2026-07" (valor que o <input type="month"> entende).
function mesInicial(): string {
  return primeiroDiaDoMesISO().slice(0, 7);
}

// Cor da barra conforme o quanto do teto já foi consumido.
function corDaBarra(estourado: boolean, proporcao: number): string {
  if (estourado) return "bg-red-500";
  if (proporcao >= 0.8) return "bg-amber-500";
  return "bg-green-500";
}

export function LimitesPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [mes, setMes] = useState(mesInicial()); // "YYYY-MM"
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const mesReferencia = `${mes}-01`;
      const [cats, limites] = await Promise.all([
        listarCategorias(),
        listarLimites(mesReferencia),
      ]);
      // Para cada limite, busca quanto já foi gasto na categoria naquele mês.
      const comStatus = await Promise.all(
        limites.map(async (limite) => ({
          limite,
          status: await statusLimite(limite.categoria.id, mesReferencia),
        })),
      );
      setCategorias(cats);
      setLinhas(comStatus);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  // Recarrega sempre que o mês muda (e na primeira carga).
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  async function excluir(linha: Linha) {
    if (!confirm(`Excluir o limite de "${linha.limite.categoria.nome}"?`)) return;
    try {
      await excluirLimite(linha.limite.id);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader titulo="Limites de gastos">
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setModalAberto(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo limite
        </button>
      </PageHeader>

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : linhas.length === 0 ? (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Nenhum limite definido para este mês.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {linhas.map(({ limite, status }) => {
            const proporcao =
              status.valorLimite > 0 ? status.valorGasto / status.valorLimite : 0;
            const largura = Math.min(proporcao, 1) * 100;
            return (
              <section
                key={limite.id}
                className="rounded-xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-800">
                      {limite.categoria.nome}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatarBRL(status.valorGasto)} de{" "}
                      {formatarBRL(status.valorLimite)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {status.estourado && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Estourou
                      </span>
                    )}
                    <button
                      onClick={() => excluir({ limite, status })}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {/* Barra de progresso: gasto vs. teto. */}
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${corDaBarra(status.estourado, proporcao)}`}
                    style={{ width: `${largura}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-slate-500">
                  {Math.round(proporcao * 100)}% do limite
                </p>
              </section>
            );
          })}
        </div>
      )}

      <NovoLimiteModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        onCriado={() => {
          setModalAberto(false);
          carregar();
        }}
        categorias={categorias}
        mesPadrao={mes}
      />
    </div>
  );
}
