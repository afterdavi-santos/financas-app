import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { criarDespesa, atualizarDespesa } from "../api/despesas";
import { statusLimiteOuNulo } from "../api/limites";
import { criarCategoria } from "../api/categorias";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { hojeISO } from "../utils/datas";
import { dataBR } from "../utils/rotulos";
import { SeletorCategoria, OPCAO_NOVA_CATEGORIA } from "./SeletorCategoria";
import { SeletorData } from "./SeletorData";
import { AvisoCategoriaSemelhante } from "./AvisoCategoriaSemelhante";
import { useCategoriasSemelhantes } from "../hooks/useCategoriasSemelhantes";
import type {
  Categoria,
  Despesa,
  FormaPagamento,
  StatusLimite,
  TipoCategoria,
} from "../types/financas";

const MAXIMO_PARCELAS = 12;

// Espelha DespesaService.dividir no backend: parcelas de 2 casas, e o resto
// da divisão inteiro na PRIMEIRA parcela (R$ 100 em 3x = 33,34 + 33,33 +
// 33,33). Só pra prévia — quem divide de verdade é o backend.
function dividirParcelas(total: number, parcelas: number): number[] {
  const centavosTotais = Math.round(total * 100);
  const cada = Math.floor(centavosTotais / parcelas);
  const resto = centavosTotais - cada * parcelas;
  return Array.from({ length: parcelas }, (_, i) => ((i === 0 ? cada + resto : cada) / 100));
}

// Modal do form de nova despesa. Recebe a lista de categorias (para o select)
// já carregada pela home, evitando uma segunda requisição aqui.
// `dataPadrao` (opcional) define a data inicial do form — a tela de Despesas
// passa uma data do mês em foco para lançar direto nele; sem ela, usa hoje.
// `despesa` (opcional) coloca o modal em modo EDIÇÃO — prefill + PUT em vez de POST.
interface Props {
  aberto: boolean;
  onClose: () => void;
  onCriada: () => void;
  categorias: Categoria[];
  dataPadrao?: string; // "YYYY-MM-DD"
  despesa?: Despesa | null;
}

export function NovaDespesaModal({
  aberto,
  onClose,
  onCriada,
  categorias,
  dataPadrao,
  despesa,
}: Props) {
  const editando = !!despesa;
  const dataInicial = dataPadrao ?? hojeISO();
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(""); // string no input; convertida ao enviar
  const [data, setData] = useState(dataInicial);
  const [categoriaId, setCategoriaId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("DEBITO");
  const [parcelas, setParcelas] = useState(1);

  // Ao (re)abrir o modal, sincroniza os campos: com despesa -> prefill (edição);
  // sem -> limpa, usando a data do mês em foco atual.
  useEffect(() => {
    if (!aberto) return;
    setDescricao(despesa?.descricao ?? "");
    setValor(despesa ? String(despesa.valor) : "");
    setData(despesa?.data ?? dataInicial);
    setCategoriaId(despesa ? String(despesa.categoria.id) : "");
    setFormaPagamento(despesa?.formaPagamento ?? "DEBITO");
    // Na edição o número de parcelas não é editável (ver `parcelado` abaixo):
    // o campo volta a 1 só pro estado não carregar lixo do lançamento anterior.
    setParcelas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, despesa, dataInicial]);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaTipo, setNovaCategoriaTipo] = useState<TipoCategoria>("VARIAVEL");
  const { sugestoes: categoriasSemelhantes } = useCategoriasSemelhantes(novaCategoriaNome, categorias);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  // Limite da categoria selecionada no mês da despesa (null = categoria sem limite).
  const [statusLimite, setStatusLimite] = useState<StatusLimite | null>(null);

  const criandoNovaCategoria = categoriaId === OPCAO_NOVA_CATEGORIA;

  // Sem nenhuma categoria disponível, já parte direto para "+ Nova
  // categoria..." (não há outra opção útil no select).
  useEffect(() => {
    if (aberto && categorias.length === 0) setCategoriaId(OPCAO_NOVA_CATEGORIA);
  }, [aberto, categorias]);

  // Sempre que a categoria ou o mês da despesa mudam, busca o limite daquela
  // categoria naquele mês para poder avisar se a despesa vai estourar o teto.
  useEffect(() => {
    if (!aberto || !categoriaId || criandoNovaCategoria) {
      setStatusLimite(null);
      return;
    }
    let cancelado = false;
    const mesReferencia = `${data.slice(0, 7)}-01`;
    statusLimiteOuNulo(Number(categoriaId), mesReferencia)
      .then((s) => {
        if (!cancelado) setStatusLimite(s);
      })
      .catch(() => {
        if (!cancelado) setStatusLimite(null);
      });
    // Cleanup: ignora respostas antigas se a categoria/mês mudou no meio da busca.
    return () => {
      cancelado = true;
    };
  }, [aberto, categoriaId, data, criandoNovaCategoria]);

  // Esta despesa já existe e faz parte de uma compra parcelada: o número de
  // parcelas de uma compra feita não muda editando uma linha (pra isso, exclui
  // — o que apaga a compra inteira — e lança de novo). Ver DespesaService.
  const parcelado = editando && despesa!.parcelasTotal > 1;

  // Categoria fixa não aceita parcelamento: ela já repete todo mês, e o
  // parcelamento também ocupa os meses seguintes — a mesma compra cairia duas
  // vezes por mês. O backend recusa (DespesaService.validarParcelamento); aqui
  // o seletor some antes disso, pra regra aparecer na hora da escolha e não
  // como erro depois de salvar.
  const categoriaSelecionada = categorias.find((c) => String(c.id) === categoriaId);
  const categoriaFixa = criandoNovaCategoria
    ? novaCategoriaTipo === "FIXA"
    : categoriaSelecionada?.tipo === "FIXA";

  const podeParcelar = !editando && formaPagamento === "CREDITO" && !categoriaFixa;
  const parcelasEfetivas = podeParcelar ? parcelas : 1;

  // Previsão do estouro: gasto atual + valor digitado vs. o teto.
  //
  // Parcelado, o que cai NESTE mês é só a primeira parcela — comparar o total
  // da compra com o teto do mês acusaria um estouro que não vai acontecer.
  const valorTotal = Number(valor);
  const valoresParcelas =
    valorTotal > 0 && parcelasEfetivas > 1 ? dividirParcelas(valorTotal, parcelasEfetivas) : null;
  const valorNum = valoresParcelas ? valoresParcelas[0] : valorTotal;
  const previsao =
    statusLimite && valorNum > 0
      ? {
          novoTotal: statusLimite.valorGasto + valorNum,
          limite: statusLimite.valorLimite,
          estoura: statusLimite.valorGasto + valorNum > statusLimite.valorLimite,
        }
      : null;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    // SeletorCategoria não é um <select> nativo — sem "required" do browser,
    // precisa validar aqui que alguma opção foi escolhida.
    if (!categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }
    setCarregando(true);
    try {
      // Se o usuário escolheu "+ Nova categoria...", cria a categoria antes
      // e usa o id retornado para a despesa.
      const idCategoria = criandoNovaCategoria
        ? (await criarCategoria({ nome: novaCategoriaNome, tipo: novaCategoriaTipo })).id
        : Number(categoriaId);

      const req = {
        descricao,
        valor: Number(valor), // <input> devolve string; backend espera número
        data,
        categoriaId: idCategoria,
        formaPagamento,
        // `valor` acima é o TOTAL da compra; o backend divide e cria uma
        // despesa por mês. Na edição não vai parcelas: o PUT altera a parcela
        // (e propaga descrição/categoria/forma às irmãs), nunca reparcela.
        ...(editando ? {} : { parcelas: parcelasEfetivas }),
      };
      if (editando) {
        await atualizarDespesa(despesa.id, req);
      } else {
        await criarDespesa(req);
        // limpa os campos para o próximo uso (só faz sentido ao criar)
        setDescricao("");
        setValor("");
        setData(dataInicial);
        setCategoriaId("");
        setFormaPagamento("DEBITO");
        setParcelas(1);
        setNovaCategoriaNome("");
        setNovaCategoriaTipo("VARIAVEL");
      }
      onCriada();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal titulo={editando ? "Editar despesa" : "Nova despesa"} aberto={aberto} onClose={onClose}>
        <form onSubmit={aoEnviar} className="space-y-4">
          {erro && (
            <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
              {erro}
            </p>
          )}

          <div className="space-y-1">
            <label
              htmlFor="descricao"
              className="text-sm font-medium text-grouper-navy"
            >
              Descrição
            </label>
            <input
              id="descricao"
              type="text"
              required
              autoFocus
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Mercado"
              className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="valor"
                className="text-sm font-medium text-grouper-navy"
              >
                Valor (R$)
              </label>
              <input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="data"
                className="text-sm font-medium text-grouper-navy"
              >
                Data
              </label>
              <SeletorData
                id="data"
                value={data}
                onChange={setData}
                className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
              />
            </div>
          </div>

          {/* Forma de pagamento. Débito = à vista, sai da conta no mês da
              própria despesa. Crédito habilita o parcelamento. */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-grouper-navy">Forma de pagamento</span>
            <div className="grid grid-cols-2 gap-2">
              {(["DEBITO", "CREDITO"] as const).map((forma) => (
                <button
                  key={forma}
                  type="button"
                  onClick={() => {
                    setFormaPagamento(forma);
                    if (forma === "DEBITO") setParcelas(1);
                  }}
                  aria-pressed={formaPagamento === forma}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    formaPagamento === forma
                      ? "border-grouper-mid bg-grouper-sky/40 text-grouper-ink"
                      : "border-grouper-sky/40 text-grouper-navy hover:bg-grouper-mist"
                  }`}
                >
                  {forma === "DEBITO" ? "Débito (à vista)" : "Crédito"}
                </button>
              ))}
            </div>
          </div>

          {podeParcelar && (
            <div className="min-w-0 space-y-1">
              <label htmlFor="parcelas" className="text-sm font-medium text-grouper-navy">
                Parcelas
              </label>
              <select
                id="parcelas"
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="w-full min-w-0 rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
              >
                {Array.from({ length: MAXIMO_PARCELAS }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
              {/* O valor digitado é o TOTAL da compra: aqui o usuário confere
                  quanto vai cair por mês antes de salvar. */}
              {valoresParcelas && (
                <p className="rounded-md border-l-4 border-grouper-mid bg-grouper-mist px-3 py-2 text-sm text-grouper-ink">
                  {parcelasEfetivas}x de {formatarBRL(valoresParcelas[1] ?? valoresParcelas[0])}
                  {valoresParcelas[0] !== valoresParcelas[1] && (
                    <> (a primeira, de {formatarBRL(valoresParcelas[0])}, leva os centavos da divisão)</>
                  )}
                  {" "}— total {formatarBRL(valorTotal)}. Uma despesa por mês, a
                  partir de {dataBR(data)}.
                </p>
              )}
            </div>
          )}

          {/* Crédito numa categoria fixa é válido — só não pode parcelar. */}
          {!editando && formaPagamento === "CREDITO" && categoriaFixa && (
            <p className="rounded-md border-l-4 border-grouper-mid bg-grouper-mist px-3 py-2 text-sm text-grouper-ink">
              Categoria fixa não aceita parcelamento: ela já repete todo mês.
              Esta despesa entra como <strong>1x</strong>. Para parcelar, escolha
              uma categoria variável.
            </p>
          )}

          {/* Edição de uma compra já parcelada: informativo, porque o PUT
              altera esta parcela e não reparcela a compra. */}
          {parcelado && (
            <p className="rounded-md border-l-4 border-grouper-mid bg-grouper-mist px-3 py-2 text-sm text-grouper-ink">
              Parcela <strong>{despesa!.parcelaNumero}/{despesa!.parcelasTotal}</strong> de uma
              compra no crédito. Descrição e categoria valem para todas as parcelas; valor e data,
              só para esta. Para trocar o número de parcelas, exclua a compra e lance de novo.
            </p>
          )}

          <div className="space-y-1">
            <label
              htmlFor="categoria"
              className="text-sm font-medium text-grouper-navy"
            >
              Categoria
            </label>
            <SeletorCategoria
              id="categoria"
              categorias={categorias}
              valor={categoriaId}
              onChange={setCategoriaId}
            />
          </div>

          {criandoNovaCategoria && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="despesa-nova-categoria"
                    className="text-sm font-medium text-grouper-navy"
                  >
                    Nome da nova categoria
                  </label>
                  <input
                    id="despesa-nova-categoria"
                    type="text"
                    required
                    autoFocus
                    value={novaCategoriaNome}
                    onChange={(e) => setNovaCategoriaNome(e.target.value)}
                    placeholder="Ex.: Alimentação"
                    className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
                  />
                </div>

                <div className="min-w-0 space-y-1">
                  <label
                    htmlFor="despesa-nova-categoria-tipo"
                    className="text-sm font-medium text-grouper-navy"
                  >
                    Tipo da categoria
                  </label>
                  <select
                    id="despesa-nova-categoria-tipo"
                    value={novaCategoriaTipo}
                    onChange={(e) => setNovaCategoriaTipo(e.target.value as TipoCategoria)}
                    className="w-full min-w-0 rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
                  >
                    <option value="VARIAVEL">Variável</option>
                    <option value="FIXA">Fixa</option>
                  </select>
                </div>
              </div>

              <AvisoCategoriaSemelhante
                sugestoes={categoriasSemelhantes}
                onSelecionar={(c) => {
                  setCategoriaId(String(c.id));
                  setNovaCategoriaNome("");
                  setNovaCategoriaTipo("VARIAVEL");
                }}
              />
            </div>
          )}

          {/* Aviso de limite: só aparece se a categoria tem teto no mês. */}
          {previsao &&
            (previsao.estoura ? (
              <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
                ⚠ Esta despesa vai <strong>estourar o limite</strong> da
                categoria: {formatarBRL(previsao.novoTotal)} de{" "}
                {formatarBRL(previsao.limite)}.
              </p>
            ) : (
              <p className="rounded-md border-l-4 border-grouper-mid bg-grouper-mist px-3 py-2 text-sm text-grouper-ink">
                Dentro do limite: ficará em {formatarBRL(previsao.novoTotal)} de{" "}
                {formatarBRL(previsao.limite)}.
              </p>
            ))}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-deep disabled:opacity-60"
            >
              {carregando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
