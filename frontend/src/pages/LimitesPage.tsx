import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { NovoLimiteModal } from "../components/NovoLimiteModal";
import { listarCategorias } from "../api/categorias";
import { listarLimites, statusLimite, excluirLimite } from "../api/limites";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { primeiroDiaDoMesISO } from "../utils/datas";
import type { Categoria, LimiteCategoria, StatusLimite } from "../types/financas";

// Cada linha junta o teto (limite fixo) com quanto já foi gasto no mês atual.
interface Linha {
  limite: LimiteCategoria;
  status: StatusLimite;
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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Limite em edição (null com modal aberto = criação de um novo).
  const [editando, setEditando] = useState<LimiteCategoria | null>(null);

  function abrirNovo() {
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(limite: LimiteCategoria) {
    setEditando(limite);
    setModalAberto(true);
  }

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      // O gasto é sempre avaliado no mês atual (o limite em si é fixo).
      const mesReferencia = primeiroDiaDoMesISO();
      const [cats, limites] = await Promise.all([
        listarCategorias(),
        listarLimites(),
      ]);
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

  useEffect(() => {
    carregar();
  }, []);

  // No modo criação, só oferecemos categorias que ainda não têm limite.
  const categoriasComLimite = new Set(linhas.map((l) => l.limite.categoria.id));
  const categoriasSemLimite = categorias.filter(
    (c) => !categoriasComLimite.has(c.id),
  );

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
        <button
          onClick={abrirNovo}
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
            Nenhum limite definido ainda.
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
                      onClick={() => abrirEdicao(limite)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Editar
                    </button>
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
        limite={editando}
        onClose={() => setModalAberto(false)}
        onCriado={() => {
          setModalAberto(false);
          carregar();
        }}
        categorias={editando ? categorias : categoriasSemLimite}
      />
    </div>
  );
}
