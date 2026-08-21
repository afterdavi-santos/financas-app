import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarLimite, statusLimiteOuNulo } from "../api/limites";
import { criarCategoria } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { primeiroDiaDoMesISO } from "../utils/datas";
import { SeletorCategoria, OPCAO_NOVA_CATEGORIA } from "./SeletorCategoria";
import { AvisoCategoriaSemelhante } from "./AvisoCategoriaSemelhante";
import { useCategoriasSemelhantes } from "../hooks/useCategoriasSemelhantes";
import type { Categoria, TipoCategoria } from "../types/financas";

// Simulador de despesa: sem gravar nada, informa se um valor hipotético numa
// categoria estouraria o limite do mês e, se não, quanto ainda sobraria.
// Sem categoria e/ou sem limite na categoria escolhida, oferece criar os dois
// inline, sem sair do modal.
interface Props {
  aberto: boolean;
  onClose: () => void;
  categorias: Categoria[];
  // Avisa a home para recarregar a lista de categorias após criar uma nova aqui.
  onCategoriaCriada?: () => void;
}

// Resultado da simulação, já pronto para exibir.
interface Resultado {
  temLimite: boolean;
  estoura: boolean;
  limite: number;
  novoTotal: number;
  sobra: number; // >= 0 quando não estoura; excedente quando estoura (negativo da sobra)
  pctSobra: number; // % do limite que ainda sobra (0 se estourar)
}

export function SimularDespesaModal({
  aberto,
  onClose,
  categorias,
  onCategoriaCriada,
}: Props) {
  const [categoriaId, setCategoriaId] = useState("");
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaTipo, setNovaCategoriaTipo] = useState<TipoCategoria>("VARIAVEL");
  const { sugestoes: categoriasSemelhantes } = useCategoriasSemelhantes(novaCategoriaNome, categorias);
  const [valor, setValor] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [novoLimiteValor, setNovoLimiteValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const criandoNovaCategoria = categoriaId === OPCAO_NOVA_CATEGORIA;

  // Ao abrir, limpa o formulário e o resultado anterior. Sem nenhuma
  // categoria disponível, já parte direto para "+ Nova categoria...".
  useEffect(() => {
    if (!aberto) return;
    setCategoriaId(categorias.length === 0 ? OPCAO_NOVA_CATEGORIA : "");
    setNovaCategoriaNome("");
    setNovaCategoriaTipo("VARIAVEL");
    setValor("");
    setResultado(null);
    setNovoLimiteValor("");
    setErro(null);
  }, [aberto, categorias]);

  async function buscarStatus(idCategoriaAtual: number) {
    const status = await statusLimiteOuNulo(
      idCategoriaAtual,
      primeiroDiaDoMesISO(),
    );
    if (!status) {
      setResultado({
        temLimite: false,
        estoura: false,
        limite: 0,
        novoTotal: 0,
        sobra: 0,
        pctSobra: 0,
      });
      return;
    }
    const novoTotal = status.valorGasto + Number(valor);
    const sobra = status.valorLimite - novoTotal;
    setResultado({
      temLimite: true,
      estoura: sobra < 0,
      limite: status.valorLimite,
      novoTotal,
      sobra,
      pctSobra:
        status.valorLimite > 0 && sobra > 0
          ? (sobra / status.valorLimite) * 100
          : 0,
    });
  }

  async function aoSimular(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }
    setResultado(null);
    setCarregando(true);
    try {
      // Se o usuário escolheu "+ Nova categoria...", cria a categoria antes
      // e passa a usá-la (sem limite ainda, então a simulação já mostra a
      // opção de criar um a seguir).
      let idCategoriaAtual = Number(categoriaId);
      if (criandoNovaCategoria) {
        const nova = await criarCategoria({ nome: novaCategoriaNome, tipo: novaCategoriaTipo });
        idCategoriaAtual = nova.id;
        setCategoriaId(String(nova.id));
        setNovaCategoriaNome("");
        onCategoriaCriada?.();
        // Limite é opcional aqui: só cria se o usuário preencheu o valor.
        if (novoLimiteValor) {
          await criarLimite({
            categoriaId: idCategoriaAtual,
            valorLimite: Number(novoLimiteValor),
          });
          setNovoLimiteValor("");
        }
      }
      await buscarStatus(idCategoriaAtual);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  async function aoCriarLimite() {
    setErro(null);
    setCarregando(true);
    try {
      await criarLimite({
        categoriaId: Number(categoriaId),
        valorLimite: Number(novoLimiteValor),
      });
      setNovoLimiteValor("");
      await buscarStatus(Number(categoriaId));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal titulo="Simular despesa" aberto={aberto} onClose={onClose}>
        <form onSubmit={aoSimular} className="space-y-4">
          {erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <div className="space-y-1">
            <label
              htmlFor="sim-categoria"
              className="text-sm font-medium text-slate-700"
            >
              Categoria
            </label>
            <SeletorCategoria
              id="sim-categoria"
              categorias={categorias}
              valor={categoriaId}
              onChange={(novoValor) => {
                // Troca manual de categoria: descarta resultado e limite ainda
                // não salvo (evita levar valores digitados para outra categoria).
                setCategoriaId(novoValor);
                setResultado(null);
                setNovoLimiteValor("");
              }}
            />
          </div>

          {criandoNovaCategoria && (
            <>
              <div className="space-y-1">
                <label
                  htmlFor="sim-nova-categoria"
                  className="text-sm font-medium text-slate-700"
                >
                  Nome da nova categoria
                </label>
                <input
                  id="sim-nova-categoria"
                  type="text"
                  required
                  autoFocus
                  value={novaCategoriaNome}
                  onChange={(e) => setNovaCategoriaNome(e.target.value)}
                  placeholder="Ex.: Alimentação"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="sim-nova-categoria-tipo"
                  className="text-sm font-medium text-slate-700"
                >
                  Tipo da categoria
                </label>
                <select
                  id="sim-nova-categoria-tipo"
                  value={novaCategoriaTipo}
                  onChange={(e) => setNovaCategoriaTipo(e.target.value as TipoCategoria)}
                  className="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="VARIAVEL">Variável</option>
                  <option value="FIXA">Fixa</option>
                </select>
              </div>

              <AvisoCategoriaSemelhante
                sugestoes={categoriasSemelhantes}
                onSelecionar={(c) => {
                  setCategoriaId(String(c.id));
                  setNovaCategoriaNome("");
                  setNovaCategoriaTipo("VARIAVEL");
                }}
              />

              <div className="space-y-1">
                <label
                  htmlFor="sim-novo-limite"
                  className="text-sm font-medium text-slate-700"
                >
                  Limite da categoria (R$) — opcional
                </label>
                <input
                  id="sim-novo-limite"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={novoLimiteValor}
                  onChange={(e) => setNovoLimiteValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label
              htmlFor="sim-valor"
              className="text-sm font-medium text-slate-700"
            >
              Valor simulado (R$)
            </label>
            <input
              id="sim-valor"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Resultado da simulação. */}
          {resultado &&
            (!resultado.temLimite ? (
              <div className="space-y-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                <p>Essa categoria não tem limite definido ainda.</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={novoLimiteValor}
                    onChange={(e) => setNovoLimiteValor(e.target.value)}
                    placeholder="Limite (R$)"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    disabled={carregando || !novoLimiteValor}
                    onClick={aoCriarLimite}
                    className="whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Criar limite
                  </button>
                </div>
              </div>
            ) : resultado.estoura ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                ⚠️ Estoura o limite: ficaria em{" "}
                {formatarBRL(resultado.novoTotal)} de{" "}
                {formatarBRL(resultado.limite)} —{" "}
                <strong>{formatarBRL(-resultado.sobra)}</strong> acima do teto.
              </p>
            ) : (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Não estoura. Ainda sobrariam{" "}
                <strong>{formatarBRL(resultado.sobra)}</strong> (
                {resultado.pctSobra.toFixed(0)}%) do limite neste mês.
              </p>
            ))}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {carregando ? "Simulando..." : "Simular"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
