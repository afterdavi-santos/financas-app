import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "./Modal";
import { Tooltip } from "./Tooltip";
import { SeletorCategoria, OPCAO_NOVA_CATEGORIA } from "./SeletorCategoria";
import { useSelecao } from "../hooks/useSelecao";
import { processarFatura } from "../api/leituraFatura";
import { criarCategoria } from "../api/categorias";
import { criarDespesasEmLote } from "../api/despesas";
import { mensagemDeErro } from "../api/erros";
import { formatarBRL } from "../utils/moeda";
import { mesAtualYYYYMM, mesSeguinteYYYYMM, primeiroDiaDoMes } from "../utils/datas";
import { dataBR, mesCurtoBR } from "../utils/rotulos";
import { corNivelDuplicata } from "../utils/cores";
import { encontrarCategoriaCartaoCredito, mesPrincipalDaFatura } from "../utils/leitorFatura";
import type { Categoria, DespesaRequest, TipoCategoria } from "../types/financas";
import type { ItemFaturaExtraido, ItemIgnorado, NivelDuplicata } from "../types/leituraFatura";

const TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024;
// Id sintético fica num espaço bem acima dos ids reais (sequenciais a partir
// de 1, vindos do backend), evitando qualquer colisão, pros itens juntados
// na revisão ("Juntar despesas equivalentes").
const BASE_ID_MESCLADO = 1_000_000;

const RÓTULO_NIVEL: Record<Exclude<NivelDuplicata, null>, string> = {
  ALTISSIMA: "Possível duplicata (mesma data/valor/descrição)",
  ALTA: "Possível duplicata (mesmo valor, data próxima)",
  MEDIA: "Possível duplicata (mesmo valor, nome parecido)",
  BLOCO: "Possível duplicata (adicionado em grupo)",
};

// Nível de duplicata exibido pra uma linha da revisão/categorização: um item
// avulso (array de 1) mantém seu próprio nível, sem alteração. Um grupo
// mesclado (2+ itens, "Juntar despesas equivalentes") sempre vira BLOCO
// quando qualquer um dos itens originais tiver alguma suspeita — nunca as
// cores de risco individual (vermelho/laranja/amarelo), porque o valor
// exibido na linha mesclada é a SOMA dos itens e nunca pode ser conferido
// exato, então usar essas cores seria enganoso (pedido do usuário).
function nivelDuplicataExibido(itens: ItemFaturaExtraido[]): NivelDuplicata {
  if (itens.length === 1) return itens[0].nivelDuplicata;
  return itens.some((i) => i.nivelDuplicata !== null) ? "BLOCO" : null;
}

// Linha exibida na revisão (e depois na categorização, sem mudança): um
// ItemFaturaExtraido normal, ou um item juntado (várias linhas com a mesma
// descrição somadas em uma só, "Juntar despesas equivalentes"). Toda despesa
// da fatura conta no mesmo mês de orçamento (mesReferencia = Props.mes,
// aplicado igual a todos em salvarTudo), então juntar itens de datas reais
// diferentes não é um problema — o valor/data agregados (data mais recente
// do grupo) já podem ser salvos direto como uma única despesa.
interface LinhaExibida {
  id: number;
  data: string;
  descricao: string;
  valor: number;
  categoriaSugeridaId: number | null;
  categoriaSugeridaNome: string | null;
  nivelDuplicata: NivelDuplicata;
  mesclado?: { chave: string; quantidade: number };
}

function normalizarDescricao(texto: string): string {
  return texto.trim().toLowerCase();
}

interface Props {
  aberto: boolean;
  onClose: () => void;
  categorias: Categoria[];
  onImportado: () => void;
  // Mês em foco na página que abriu o leitor ("YYYY-MM") — é o mês em que a
  // fatura está sendo paga/subida: TODA despesa importada conta nesse mês no
  // orçamento (mesReferencia), independente da data real de cada compra, ver
  // `LeituraFaturaService.processar`.
  mes: string;
}

export function LeitorFaturaModal({ aberto, onClose, categorias, onImportado, mes }: Props) {
  const [etapa, setEtapa] = useState<"upload" | "revisao" | "categorizacao">("upload");
  const [carregandoUpload, setCarregandoUpload] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [itensExtraidos, setItensExtraidos] = useState<ItemFaturaExtraido[]>([]);
  const [itensIgnorados, setItensIgnorados] = useState<ItemIgnorado[]>([]);
  const [mostrarIgnorados, setMostrarIgnorados] = useState(false);
  const [mostrarProntos, setMostrarProntos] = useState(false);
  // Um único interruptor pra todos os grupos de uma vez (em vez de um botão
  // "Juntar" por linha) — liga/desliga a junção de TODAS as despesas com
  // descrição equivalente ao mesmo tempo.
  const [juntarEquivalentes, setJuntarEquivalentes] = useState(false);
  const selecaoRevisao = useSelecao();

  const [categoriasLocais, setCategoriasLocais] = useState<Categoria[]>(categorias);
  const [itensParaCategorizar, setItensParaCategorizar] = useState<LinhaExibida[]>([]);
  const [itensProntos, setItensProntos] = useState<{ item: LinhaExibida; categoriaId: number }[]>([]);
  const selecaoLote = useSelecao();
  const [categoriaBatchId, setCategoriaBatchId] = useState("");
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaTipo, setNovaCategoriaTipo] = useState<TipoCategoria>("VARIAVEL");
  const [erroLote, setErroLote] = useState<string | null>(null);
  const [carregandoLote, setCarregandoLote] = useState(false);

  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [carregandoSalvar, setCarregandoSalvar] = useState(false);

  // Mês em que as despesas importadas vão contar no orçamento
  // (`mesReferencia`) — decoupled do prop `mes` (usado só pra chamada de
  // upload, ver comentário na Props). Começa igual ao `mes` da página, mas
  // é ajustado assim que a fatura é processada (ver aoEscolherArquivo) com
  // base no "mês principal" calculado a partir das datas reais dos itens.
  const [mesEscolhido, setMesEscolhido] = useState(mes);
  const [mesPrincipal, setMesPrincipal] = useState<string | null>(null);
  // Fallback só de segurança de tipos — na prática o popup de escolha de mês
  // só abre depois da fatura processada, quando mesPrincipal já está setado.
  const mesPrincipalPopup = mesPrincipal ?? mesAtualYYYYMM();

  // O componente monta uma vez só (junto com a HomePage) e fica sempre na
  // árvore (é o Modal por dentro que entra/sai do DOM via `aberto`), então
  // `categoriasLocais` (inicializada de `categorias` só na 1ª montagem)
  // ficava presa na lista que existia naquele instante — normalmente vazia,
  // porque a HomePage ainda nem tinha terminado de buscar as categorias.
  // Resincroniza toda vez que o modal abre, pra sempre refletir a lista real.
  useEffect(() => {
    if (aberto) setCategoriasLocais(categorias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  // Reinicia todo o estado interno — chamado ao fechar, pra não deixar
  // resquício de uma importação anterior a próxima vez que o modal abrir.
  function reiniciar() {
    setEtapa("upload");
    setErroUpload(null);
    setItensExtraidos([]);
    setItensIgnorados([]);
    setMostrarIgnorados(false);
    setJuntarEquivalentes(false);
    selecaoRevisao.limpar();
    setCategoriasLocais(categorias);
    setItensParaCategorizar([]);
    setItensProntos([]);
    setMostrarProntos(false);
    selecaoLote.limpar();
    setCategoriaBatchId("");
    setNovaCategoriaNome("");
    setErroLote(null);
    setErroSalvar(null);
    setPedindoConfirmacaoSalvarParcial(false);
    setMesEscolhido(mes);
    setMesPrincipal(null);
    setPedindoEscolhaMes(false);
    setPedindoConfirmacaoCartaoTodos(false);
  }

  function aoFechar() {
    reiniciar();
    onClose();
  }

  // Popup de aviso próprio (não o confirm() nativo do navegador) pra
  // perguntar se o usuário quer mesmo cancelar a leitura em andamento.
  const [pedindoConfirmacaoFechar, setPedindoConfirmacaoFechar] = useState(false);

  // Passado como onClose do Modal — cobre backdrop, X e Esc (o Modal genérico
  // não distingue entre eles). Só pede confirmação se já há algo em
  // andamento (fatura processada ou etapa além do upload); fechar uma tela
  // de upload vazia não perde nada, então não precisa confirmar.
  function tentarFechar() {
    const emProgresso = etapa !== "upload" || itensExtraidos.length > 0;
    if (emProgresso) {
      setPedindoConfirmacaoFechar(true);
      return;
    }
    aoFechar();
  }

  function manterAberto() {
    setPedindoConfirmacaoFechar(false);
  }

  function confirmarCancelamento() {
    setPedindoConfirmacaoFechar(false);
    aoFechar();
  }

  function voltarParaUpload() {
    setEtapa("upload");
  }

  function voltarParaRevisao() {
    setEtapa("revisao");
  }

  // Popup de aviso próprio pra confirmar salvar deixando itens sem
  // categoria pra trás — só usado quando ainda há itens pendentes
  // (`itensParaCategorizar.length > 0`); com tudo categorizado, o botão
  // salva direto, sem aviso.
  const [pedindoConfirmacaoSalvarParcial, setPedindoConfirmacaoSalvarParcial] = useState(false);

  // Popup separado (próximo passo, não inline na tela de categorização) pra
  // escolher o mês de orçamento antes de salvar de fato.
  const [pedindoEscolhaMes, setPedindoEscolhaMes] = useState(false);

  function aoClicarContinuar() {
    if (itensParaCategorizar.length > 0) {
      setPedindoConfirmacaoSalvarParcial(true);
      return;
    }
    setPedindoEscolhaMes(true);
  }

  function manterCategorizando() {
    setPedindoConfirmacaoSalvarParcial(false);
  }

  function confirmarSalvarParcial() {
    setPedindoConfirmacaoSalvarParcial(false);
    setPedindoEscolhaMes(true);
  }

  function voltarDaEscolhaMes() {
    setPedindoEscolhaMes(false);
  }

  function confirmarEscolhaMes() {
    setPedindoEscolhaMes(false);
    salvarTudo();
  }

  // Agrupa os itens brutos por descrição normalizada — grupos com 2+ itens
  // ganham a opção de juntar na tela de revisão. O backend já garante que
  // `itensExtraidos` só tem despesas do mês selecionado (`mes`), então um
  // grupo nunca cruza mês.
  const grupos = useMemo(() => {
    const mapa = new Map<string, ItemFaturaExtraido[]>();
    for (const item of itensExtraidos) {
      const chave = normalizarDescricao(item.descricao);
      const lista = mapa.get(chave) ?? [];
      lista.push(item);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [itensExtraidos]);

  // Lista exibida na revisão (e, sem mudança, também na categorização): com
  // juntarEquivalentes desligado, cada item aparece individualmente; ligado,
  // todo grupo com 2+ itens vira uma única linha combinada (soma dos
  // valores, data mais recente do grupo) — como todas contam no mesmo mês de
  // orçamento (mesReferencia), essa soma já pode ser salva direto como uma
  // despesa só.
  const linhasRevisao: LinhaExibida[] = useMemo(() => {
    const linhas: LinhaExibida[] = [];
    let indiceGrupo = 0;
    for (const [chave, itens] of grupos) {
      if (juntarEquivalentes && itens.length > 1) {
        const valorTotal = itens.reduce((soma, i) => soma + i.valor, 0);
        const dataMaisRecente = itens.reduce((max, i) => (i.data > max ? i.data : max), itens[0].data);
        linhas.push({
          id: BASE_ID_MESCLADO + indiceGrupo,
          data: dataMaisRecente,
          descricao: `${itens[0].descricao} (${itens.length}x)`,
          valor: valorTotal,
          categoriaSugeridaId: itens[0].categoriaSugeridaId,
          categoriaSugeridaNome: itens[0].categoriaSugeridaNome,
          nivelDuplicata: nivelDuplicataExibido(itens),
          mesclado: { chave, quantidade: itens.length },
        });
      } else {
        for (const item of itens) {
          linhas.push({ ...item });
        }
      }
      indiceGrupo++;
    }
    return linhas.sort((a, b) => b.data.localeCompare(a.data));
  }, [grupos, juntarEquivalentes]);

  const idsVisiveis = linhasRevisao.map((l) => l.id);
  const selecionadosVisiveis = idsVisiveis.filter((id) => selecaoRevisao.selecionados.has(id));

  async function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setErroUpload(null);

    if (!arquivo.name.toLowerCase().endsWith(".csv")) {
      setErroUpload("Envie um arquivo .csv exportado do Nubank.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setErroUpload("Arquivo excede o tamanho máximo de 2MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setCarregandoUpload(true);
    try {
      const { itens, ignorados } = await processarFatura(arquivo, mes);
      setItensExtraidos(itens);
      setItensIgnorados(ignorados);
      // Suspeitas de duplicata começam desmarcadas; o resto, marcado.
      selecaoRevisao.selecionarTodos(
        itens.filter((i) => i.nivelDuplicata === null).map((i) => i.id),
      );

      // Mês principal = moda das datas reais dos itens (não das linhas já
      // mescladas). Pré-seleção (entre o próprio mês principal e o mês
      // seguinte a ele — não o mês atual real, ver popup de escolha de mês):
      // se a fatura é majoritariamente do mês atual, ainda deve fechar/ser
      // paga no mês seguinte a ela; se já é de um mês passado, assume que
      // está sendo paga no próprio mês da fatura.
      const principal = mesPrincipalDaFatura(itens);
      setMesPrincipal(principal);
      if (principal) {
        setMesEscolhido(principal === mesAtualYYYYMM() ? mesSeguinteYYYYMM(principal) : principal);
      }

      setEtapa("revisao");
    } catch (e) {
      setErroUpload(mensagemDeErro(e));
    } finally {
      setCarregandoUpload(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // Liga/desliga a junção de TODOS os grupos com 2+ itens de uma vez. Ao
  // ligar, cada grupo vira uma linha combinada — selecionada por padrão só se
  // NENHUM item do grupo for suspeita de duplicata (mesmo critério dos itens
  // avulsos: duplicatas começam desmarcadas); as linhas originais somem da
  // seleção. Ao desligar, volta pras linhas individuais, restaurando a
  // seleção padrão (duplicatas ficam desmarcadas).
  function alternarJuntarEquivalentes() {
    const ligando = !juntarEquivalentes;
    setJuntarEquivalentes(ligando);
    let indiceGrupo = 0;
    for (const itensDoGrupo of grupos.values()) {
      if (itensDoGrupo.length > 1) {
        if (ligando) {
          selecaoRevisao.desselecionarTodos(itensDoGrupo.map((i) => i.id));
          if (nivelDuplicataExibido(itensDoGrupo) === null) {
            selecaoRevisao.selecionarTodos([BASE_ID_MESCLADO + indiceGrupo]);
          }
        } else {
          selecaoRevisao.desselecionarTodos([BASE_ID_MESCLADO + indiceGrupo]);
          selecaoRevisao.selecionarTodos(
            itensDoGrupo.filter((i) => i.nivelDuplicata === null).map((i) => i.id),
          );
        }
      }
      indiceGrupo++;
    }
  }

  function continuarParaCategorizacao() {
    const selecionadas = linhasRevisao.filter((l) => selecaoRevisao.selecionados.has(l.id));
    setItensParaCategorizar(selecionadas);
    setItensProntos([]);
    setEtapa("categorizacao");
  }

  const criandoNovaCategoriaLote = categoriaBatchId === OPCAO_NOVA_CATEGORIA;

  const categoriaCartaoExistente = useMemo(
    () => encontrarCategoriaCartaoCredito(categoriasLocais),
    [categoriasLocais],
  );

  // Popup de aviso próprio — só aparece quando já existem itens
  // categorizados manualmente antes de clicar no atalho (ver
  // aplicarCategoriaCartaoATodos), pra não sobrescrever silenciosamente uma
  // categorização que a pessoa já tinha feito.
  const [pedindoConfirmacaoCartaoTodos, setPedindoConfirmacaoCartaoTodos] = useState(false);

  // Atalho: aplica a categoria "Cartão de crédito" (criando-a se ainda não
  // existir uma parecida). O fluxo manual em lote (selecionar + escolher
  // outra categoria) continua disponível pra despesas que não sejam de
  // cartão nessa mesma fatura.
  function aplicarCategoriaCartaoATodos() {
    setErroLote(null);
    if (itensParaCategorizar.length === 0) return;
    // Já há itens categorizados manualmente: pergunta antes de decidir se
    // isso é sobrescrito (ignorado) ou preservado.
    if (itensProntos.length > 0) {
      setPedindoConfirmacaoCartaoTodos(true);
      return;
    }
    executarCategoriaCartaoATodos(false);
  }

  function manterCartaoTodosParado() {
    setPedindoConfirmacaoCartaoTodos(false);
  }

  // `ignorarExistentes`: false = mantém itensProntos como estão, só aplica a
  // categoria de cartão nos restantes (`itensParaCategorizar`); true =
  // ignora a categorização já feita e joga TUDO (os já categorizados +
  // os restantes) na categoria de cartão.
  async function executarCategoriaCartaoATodos(ignorarExistentes: boolean) {
    setPedindoConfirmacaoCartaoTodos(false);
    setErroLote(null);
    setCarregandoLote(true);
    try {
      let categoriaId: number;
      if (categoriaCartaoExistente) {
        categoriaId = categoriaCartaoExistente.id;
      } else {
        const nova = await criarCategoria({ nome: "Cartão de crédito", tipo: "VARIAVEL" });
        categoriaId = nova.id;
        setCategoriasLocais((atual) => [...atual, nova]);
      }

      const baseProntos = ignorarExistentes
        ? itensProntos.map(({ item }) => ({ item, categoriaId }))
        : itensProntos;
      setItensProntos([
        ...baseProntos,
        ...itensParaCategorizar.map((item) => ({ item, categoriaId })),
      ]);
      setItensParaCategorizar([]);
      selecaoLote.limpar();
    } catch (e) {
      setErroLote(mensagemDeErro(e));
    } finally {
      setCarregandoLote(false);
    }
  }

  async function aplicarCategoriaAoLote() {
    setErroLote(null);
    if (!categoriaBatchId) {
      setErroLote("Selecione uma categoria.");
      return;
    }
    if (selecaoLote.selecionados.size === 0) {
      setErroLote("Selecione pelo menos um item.");
      return;
    }
    setCarregandoLote(true);
    try {
      let categoriaId: number;
      if (criandoNovaCategoriaLote) {
        const nova = await criarCategoria({ nome: novaCategoriaNome, tipo: novaCategoriaTipo });
        categoriaId = nova.id;
        setCategoriasLocais((atual) => [...atual, nova]);
      } else {
        categoriaId = Number(categoriaBatchId);
      }

      const selecionados = itensParaCategorizar.filter((i) => selecaoLote.selecionados.has(i.id));
      setItensProntos((atual) => [...atual, ...selecionados.map((item) => ({ item, categoriaId }))]);
      setItensParaCategorizar((atual) => atual.filter((i) => !selecaoLote.selecionados.has(i.id)));
      selecaoLote.limpar();
      setCategoriaBatchId("");
      setNovaCategoriaNome("");
      setNovaCategoriaTipo("VARIAVEL");
    } catch (e) {
      setErroLote(mensagemDeErro(e));
    } finally {
      setCarregandoLote(false);
    }
  }

  async function salvarTudo() {
    setErroSalvar(null);
    setCarregandoSalvar(true);
    try {
      const despesas: DespesaRequest[] = itensProntos.map(({ item, categoriaId }) => ({
        descricao: item.descricao,
        valor: item.valor,
        data: item.data,
        categoriaId,
        mesReferencia: primeiroDiaDoMes(mesEscolhido),
      }));
      await criarDespesasEmLote(despesas);
      reiniciar();
      onImportado();
    } catch (e) {
      setErroSalvar(mensagemDeErro(e));
    } finally {
      setCarregandoSalvar(false);
    }
  }

  return (
    <>
    <Modal
      titulo="Leitor de fatura"
      aberto={aberto}
      onClose={tentarFechar}
      largura="max-w-4xl"
      bordaCabecalho={false}
    >
      {etapa === "upload" && (
        <div className="space-y-4">
          <p className="text-justify text-sm text-grouper-navy">
            Exporte a fatura do cartão pelo app do Nubank em formato CSV (siga
            o tutorial caso tenha dúvidas, mas lembre-se de selecionar a opção
            CSV ao invés de PDF) e selecione o arquivo clicando em Selecionar
            Fatura. Nada é salvo até você revisar e confirmar as despesas na
            próxima etapa.
          </p>

          {erroUpload && (
            <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
              {erroUpload}
            </p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={aoEscolherArquivo}
            disabled={carregandoUpload}
            className="hidden"
          />
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={carregandoUpload}
              className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-deep disabled:opacity-60"
            >
              {carregandoUpload ? "Lendo fatura..." : "Selecionar CSV da fatura"}
            </button>
            <a
              href="https://www.youtube.com/watch?v=6XWIS6YDm4g&pp=ygUdZXhwb3J0YXIgZmF0dXJhIG51YmFuayBlbSBjc3Y%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border-2 border-grouper-mid px-4 py-2 font-display text-sm font-semibold text-grouper-mid hover:bg-grouper-mist"
            >
              Tutorial de exportação
            </a>
          </div>
        </div>
      )}

      {etapa === "revisao" && (
        <div className="space-y-4">
          {itensExtraidos.length === 0 && (
            <>
              <p className="text-sm text-grouper-navy/60">
                {itensIgnorados.length > 0
                  ? "Nenhuma despesa importável nesse arquivo — todas as linhas eram estorno, reembolso ou pagamento da fatura."
                  : "Nenhuma despesa encontrada nesse arquivo."}
              </p>
              {itensIgnorados.length > 0 && (
                <ul className="max-h-60 divide-y divide-grouper-ink/20 overflow-y-auto rounded-md border border-grouper-ink/20">
                  {itensIgnorados.map((item, indice) => (
                    <li key={indice} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <span className="text-grouper-navy/70">{item.descricao}</span>
                        <p className="text-xs text-grouper-navy/50">{dataBR(item.data)} · {item.motivo}</p>
                      </div>
                      <span className="shrink-0 text-grouper-navy/70">{formatarBRL(item.valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={voltarParaUpload}
                  className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={aoFechar}
                  className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
                >
                  Fechar
                </button>
              </div>
            </>
          )}
          {itensExtraidos.length > 0 && (
            <>
              <p className="text-sm text-grouper-navy">Selecione as despesas que deseja incluir</p>
              <div className="flex flex-wrap items-center gap-4">
                {/* Alterna entre marcar/desmarcar tudo de uma vez — útil
                    quando a seleção padrão (tudo marcado, exceto
                    duplicatas) não é o que o usuário quer nessa fatura e é
                    mais fácil partir do zero (ou voltar a marcar tudo). */}
                <label className="flex items-center gap-2 text-base font-semibold text-grouper-navy">
                  <input
                    type="checkbox"
                    checked={selecionadosVisiveis.length > 0}
                    onChange={() =>
                      selecionadosVisiveis.length === 0
                        ? selecaoRevisao.selecionarTodos(idsVisiveis)
                        : selecaoRevisao.desselecionarTodos(idsVisiveis)
                    }
                    className="h-4 w-4 rounded border-grouper-sky text-grouper-mid focus:ring-grouper-mid"
                  />
                  Selecionar todos
                </label>
                {/* Discretos de propósito (checkbox + texto, não botões
                    grandes) — pra não disputar atenção com os botões de
                    ação no rodapé da tela. */}
                <label className="flex items-center gap-2 text-base font-semibold text-grouper-navy">
                  <input
                    type="checkbox"
                    checked={juntarEquivalentes}
                    onChange={alternarJuntarEquivalentes}
                    className="h-4 w-4 rounded border-grouper-sky text-grouper-mid focus:ring-grouper-mid"
                  />
                  Juntar despesas equivalentes
                </label>
              </div>
              <ul className="max-h-96 divide-y divide-grouper-ink/20 overflow-y-auto rounded-md border border-grouper-ink/20">
                {linhasRevisao.map((linha, indice) => (
                  <li key={linha.id} className="flex items-center gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selecaoRevisao.selecionados.has(linha.id)}
                      onChange={() => selecaoRevisao.alternar(linha.id)}
                      className="h-4 w-4 shrink-0 rounded border-grouper-sky text-grouper-mid focus:ring-grouper-mid"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-normal text-grouper-ink">{linha.descricao}</span>
                        {linha.nivelDuplicata && (
                          <Tooltip
                            texto={RÓTULO_NIVEL[linha.nivelDuplicata]}
                            vertical={indice === 0 ? "baixo" : "cima"}
                          >
                            {/* <button>, não <span>: precisa ser focável pra
                                o tooltip funcionar no mobile (sem :hover lá,
                                só :focus-within — ver Tooltip.tsx). Primeiro
                                item da lista usa vertical="baixo": o balão
                                abre pra cima por padrão, mas sem espaço acima
                                dentro do `overflow-y-auto` do <ul>, ele ficava
                                cortado (mesmo padrão de Objetivos, ver
                                a11y-e-responsividade.md). */}
                            <button
                              type="button"
                              className="rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: corNivelDuplicata(linha.nivelDuplicata).fundo,
                                color: corNivelDuplicata(linha.nivelDuplicata).texto,
                              }}
                            >
                              ⚠ Possível duplicata
                            </button>
                          </Tooltip>
                        )}
                      </div>
                      <p className="text-xs font-medium text-grouper-deep">
                        {dataBR(linha.data)}
                        {linha.categoriaSugeridaNome && ` · sugestão: ${linha.categoriaSugeridaNome}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-grouper-ink">
                      {formatarBRL(linha.valor)}
                    </span>
                  </li>
                ))}
              </ul>

              {itensIgnorados.length > 0 && (
                <div className="rounded-md border border-grouper-ink/20">
                  <button
                    type="button"
                    onClick={() => setMostrarIgnorados((atual) => !atual)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-grouper-navy hover:bg-grouper-mist"
                  >
                    <span>
                      {itensIgnorados.length} {itensIgnorados.length === 1 ? "item ignorado" : "itens ignorados"}
                    </span>
                    <span className="text-xs text-grouper-navy/60">
                      {mostrarIgnorados ? "ocultar ▲" : "ver ▼"}
                    </span>
                  </button>
                  {mostrarIgnorados && (
                    <ul className="max-h-40 divide-y divide-grouper-ink/20 overflow-y-auto border-t border-grouper-ink/20">
                      {itensIgnorados.map((item, indice) => (
                        <li key={indice} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <span className="text-grouper-navy/70">{item.descricao}</span>
                            <p className="text-xs text-grouper-navy/50">{dataBR(item.data)} · {item.motivo}</p>
                          </div>
                          <span className="shrink-0 text-grouper-navy/70">{formatarBRL(item.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={voltarParaUpload}
                  className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
                >
                  ← Voltar
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={aoFechar}
                    className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={selecionadosVisiveis.length === 0}
                    onClick={continuarParaCategorizacao}
                    className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-deep disabled:opacity-60"
                  >
                    Continuar com {selecionadosVisiveis.length} selecionada(s)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {etapa === "categorizacao" && (
        <div className="space-y-4">
          <p className="-mt-3 mb-2 text-sm font-semibold text-grouper-ink">
            Você pode categorizar as despesas manualmente, ou adicionar todas as
            despesas de uma vez{" "}
            {categoriaCartaoExistente
              ? "(na categoria Cartão de crédito)"
              : "(criando a categoria Cartão de crédito)"}
            .
          </p>

          {erroSalvar && (
            <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
              {erroSalvar}
            </p>
          )}

          {itensParaCategorizar.length > 0 ? (
            <div className="space-y-3 rounded-md border border-grouper-ink/20 p-3">
              {erroLote && (
                <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
                  {erroLote}
                </p>
              )}

              {/* Despesas à esquerda, categoria à direita (pedido do
                  usuário) — empilha no mobile, lado a lado a partir de
                  `lg`. A lista fica no espaço que sobra (`flex-1`); o
                  painel de categoria tem largura fixa. */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1 space-y-3">
                  <SelecionarTodosLote
                    itens={itensParaCategorizar}
                    selecaoLote={selecaoLote}
                  />

                  <ul className="max-h-72 divide-y divide-grouper-ink/20 overflow-y-auto">
                    {itensParaCategorizar.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selecaoLote.selecionados.has(item.id)}
                          onChange={() => selecaoLote.alternar(item.id)}
                          className="h-4 w-4 shrink-0 rounded border-grouper-sky text-grouper-mid focus:ring-grouper-mid"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-normal text-grouper-ink">{item.descricao}</span>
                          <p className="text-xs font-medium text-grouper-deep">
                            {dataBR(item.data)}
                            {item.categoriaSugeridaNome && ` · sugestão: ${item.categoriaSugeridaNome}`}
                          </p>
                        </div>
                        <span className="shrink-0 text-grouper-ink">
                          {formatarBRL(item.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="w-full space-y-3 lg:w-64 lg:shrink-0">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-grouper-navy">
                      Categoria para os itens marcados
                    </label>
                    <SeletorCategoria
                      id="leitor-fatura-categoria-lote"
                      categorias={categoriasLocais}
                      valor={categoriaBatchId}
                      onChange={setCategoriaBatchId}
                    />
                  </div>

                  {criandoNovaCategoriaLote && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-grouper-navy">
                          Nome da nova categoria
                        </label>
                        <input
                          type="text"
                          required
                          value={novaCategoriaNome}
                          onChange={(e) => setNovaCategoriaNome(e.target.value)}
                          placeholder="Ex.: Transporte"
                          className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-grouper-navy">
                          Tipo da categoria
                        </label>
                        <select
                          value={novaCategoriaTipo}
                          onChange={(e) => setNovaCategoriaTipo(e.target.value as TipoCategoria)}
                          className="w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50"
                        >
                          <option value="VARIAVEL">Variável</option>
                          <option value="FIXA">Fixa</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={carregandoLote}
                    onClick={aplicarCategoriaAoLote}
                    className="w-full rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-deep disabled:opacity-60"
                  >
                    {carregandoLote ? "Aplicando..." : "Aplicar à seleção"}
                  </button>

                  {/* Atalho: em praticamente toda fatura de cartão, todas as
                      despesas são a mesma categoria — evita repetir o fluxo
                      manual de selecionar + escolher categoria + aplicar
                      acima. */}
                  <div className="space-y-1 border-t border-grouper-ink/20 pt-3">
                    <button
                      type="button"
                      disabled={carregandoLote}
                      onClick={aplicarCategoriaCartaoATodos}
                      className="w-full rounded-md bg-grouper-deep px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-ink disabled:opacity-60"
                    >
                      {carregandoLote
                        ? "Aplicando..."
                        : categoriaCartaoExistente
                          ? "Adicionar todas as despesas na categoria Cartão de crédito"
                          : "Criar a categoria Cartão de crédito e adicionar todas as despesas"}
                    </button>
                    <p className="text-center text-xs text-grouper-navy/70">
                      ou categorize manualmente acima
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-grouper-mid bg-grouper-mist px-3 py-2 text-sm text-grouper-ink">
              Todos os itens selecionados já têm categoria. Confira e salve.
            </p>
          )}

          {itensProntos.length > 0 && (
            <div className="rounded-md border border-grouper-ink/20">
              <button
                type="button"
                onClick={() => setMostrarProntos((atual) => !atual)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-grouper-navy hover:bg-grouper-mist"
              >
                <span>{itensProntos.length} já categorizada(s)</span>
                <span className="text-xs text-grouper-navy/60">
                  {mostrarProntos ? "ocultar ▲" : "ver ▼"}
                </span>
              </button>
              {mostrarProntos && (
                <ul className="max-h-40 divide-y divide-grouper-ink/20 overflow-y-auto border-t border-grouper-ink/20">
                  {itensProntos.map(({ item, categoriaId }) => (
                    <li key={item.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span className="text-grouper-ink">{item.descricao}</span>
                      <span className="text-xs font-medium text-grouper-deep">
                        {categoriasLocais.find((c) => c.id === categoriaId)?.nome ?? "categoria nova"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={voltarParaRevisao}
              className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
            >
              ← Voltar
            </button>
            <div className="flex gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={itensProntos.length === 0 || carregandoSalvar}
              onClick={aoClicarContinuar}
              className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-deep disabled:opacity-60"
            >
              {carregandoSalvar
                ? "Salvando..."
                : itensParaCategorizar.length > 0
                  ? `Continuar com ${itensProntos.length} despesa(s)`
                  : "Continuar"}
            </button>
            </div>
          </div>
        </div>
      )}
    </Modal>

    {/* Popup de aviso próprio (não o confirm() nativo do navegador),
        sobreposto ao Modal (z-index maior) — pergunta antes de descartar
        uma leitura de fatura já em andamento. */}
    {pedindoConfirmacaoFechar && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
        onClick={manterAberto}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          className="w-full max-w-sm rounded-xl border-2 border-grouper-ink bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-display text-lg font-semibold text-grouper-ink">
            Cancelar a leitura da fatura?
          </h3>
          <p className="mt-2 text-sm text-grouper-navy">
            As despesas revisadas ainda não foram salvas e serão perdidas.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={manterAberto}
              className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
            >
              Continuar editando
            </button>
            <button
              type="button"
              onClick={confirmarCancelamento}
              className="rounded-md bg-red-600 px-4 py-2 font-display text-sm font-semibold text-white hover:bg-red-700"
            >
              Cancelar leitura
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Popup de aviso próprio — só aparece quando o atalho de "Cartão de
        crédito" é clicado depois que já existem itens categorizados
        manualmente, pra não sobrescrever essa categorização sem avisar. */}
    {pedindoConfirmacaoCartaoTodos && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
        onClick={manterCartaoTodosParado}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          className="w-full max-w-sm rounded-xl border-2 border-grouper-ink bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-display text-lg font-semibold text-grouper-ink">
            Já há despesas categorizadas
          </h3>
          <p className="mt-2 text-sm text-grouper-navy">
            {itensProntos.length} despesa(s) já {itensProntos.length === 1 ? "foi categorizada" : "foram categorizadas"} manualmente. O que você quer fazer?
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => executarCategoriaCartaoATodos(false)}
              className="w-full rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-deep"
            >
              Manter as já categorizadas e adicionar as restantes no Cartão de crédito
            </button>
            <button
              type="button"
              onClick={() => executarCategoriaCartaoATodos(true)}
              className="w-full rounded-md border-2 border-grouper-deep px-4 py-2 font-display text-sm font-semibold text-grouper-deep hover:bg-grouper-mist"
            >
              Ignorar e adicionar todas no Cartão de crédito
            </button>
            <button
              type="button"
              onClick={manterCartaoTodosParado}
              className="w-full rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Popup de aviso próprio, mesmo padrão do de cancelamento acima —
        avisa que itens ainda sem categoria ficarão de fora ao continuar. */}
    {pedindoConfirmacaoSalvarParcial && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
        onClick={manterCategorizando}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          className="w-full max-w-sm rounded-xl border-2 border-grouper-ink bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-display text-lg font-semibold text-grouper-ink">
            Continuar sem categorizar tudo?
          </h3>
          <p className="mt-2 text-sm text-grouper-navy">
            As despesas que ainda não têm categoria não serão incluídas.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={manterCategorizando}
              className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
            >
              Continuar categorizando
            </button>
            <button
              type="button"
              onClick={confirmarSalvarParcial}
              className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-deep"
            >
              Continuar mesmo assim
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Popup próprio (próximo passo, não fica embutido na tela de
        categorização) — escolha do mês de orçamento (mesReferencia) antes
        de salvar de fato, decoupled do mês que já estava selecionado na
        página que abriu o modal. */}
    {pedindoEscolhaMes && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
        onClick={voltarDaEscolhaMes}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          className="w-full max-w-sm rounded-xl border-2 border-grouper-ink bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-display text-lg font-semibold text-grouper-ink">
            Em qual mês essas despesas devem contar?
          </h3>
          {mesPrincipalPopup && (
            <p className="mt-2 text-sm text-grouper-navy">
              Esta fatura é principalmente de{" "}
              <span className="font-semibold text-grouper-ink">
                {mesCurtoBR(primeiroDiaDoMes(mesPrincipalPopup))}
              </span>
              . Ela deve contar no mês da própria fatura ou no mês seguinte
              (quando ela costuma ser paga)?
            </p>
          )}
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => setMesEscolhido(mesPrincipalPopup)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium ${
                mesEscolhido === mesPrincipalPopup
                  ? "bg-grouper-sky/40 text-grouper-ink"
                  : "text-grouper-navy hover:bg-grouper-sky/25"
              }`}
            >
              <span
                className={`h-4 w-4 shrink-0 rounded-sm border-2 ${
                  mesEscolhido === mesPrincipalPopup
                    ? "border-grouper-mid bg-grouper-mid"
                    : "border-grouper-sky"
                }`}
              />
              Mês da fatura ({mesCurtoBR(primeiroDiaDoMes(mesPrincipalPopup))})
            </button>
            <button
              type="button"
              onClick={() => setMesEscolhido(mesSeguinteYYYYMM(mesPrincipalPopup))}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium ${
                mesEscolhido === mesSeguinteYYYYMM(mesPrincipalPopup)
                  ? "bg-grouper-sky/40 text-grouper-ink"
                  : "text-grouper-navy hover:bg-grouper-sky/25"
              }`}
            >
              <span
                className={`h-4 w-4 shrink-0 rounded-sm border-2 ${
                  mesEscolhido === mesSeguinteYYYYMM(mesPrincipalPopup)
                    ? "border-grouper-mid bg-grouper-mid"
                    : "border-grouper-sky"
                }`}
              />
              Mês seguinte ({mesCurtoBR(primeiroDiaDoMes(mesSeguinteYYYYMM(mesPrincipalPopup)))})
            </button>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={voltarDaEscolhaMes}
              className="rounded-md px-4 py-2 font-display text-sm font-semibold text-grouper-navy hover:bg-grouper-mist"
            >
              ← Voltar
            </button>
            <button
              type="button"
              disabled={carregandoSalvar}
              onClick={confirmarEscolhaMes}
              className="rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold text-white hover:bg-grouper-deep disabled:opacity-60"
            >
              {carregandoSalvar ? "Salvando..." : "Confirmar e salvar"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// Pequeno "selecionar todos" local ao lote em edição (não usa o componente
// compartilhado SelecionarTodos porque a marcação aqui é sobre a lista de
// trabalho da categorização, não a revisão principal).
function SelecionarTodosLote({
  itens,
  selecaoLote,
}: {
  itens: LinhaExibida[];
  selecaoLote: ReturnType<typeof useSelecao>;
}) {
  const ids = itens.map((i) => i.id);
  const todos = ids.length > 0 && ids.every((id) => selecaoLote.selecionados.has(id));
  return (
    <label className="flex items-center gap-2 text-sm text-grouper-navy/70">
      <input
        type="checkbox"
        checked={todos}
        onChange={() => (todos ? selecaoLote.limpar() : selecaoLote.selecionarTodos(ids))}
        className="h-4 w-4 rounded border-grouper-sky text-grouper-mid focus:ring-grouper-mid"
      />
      Selecionar todos os restantes
    </label>
  );
}
