// Espelha os DTOs do backend (pacote com.financas.app.dto), como types/auth.ts.
// LocalDate (Java) vira string "YYYY-MM-DD" no JSON; BigDecimal vira number.

// -> enum TipoCategoria (FIXA | VARIAVEL)
export type TipoCategoria = "FIXA" | "VARIAVEL";

// -> enum TipoRenda (FIXA | FREELA | RETORNO_INVESTIMENTOS)
export type TipoRenda = "FIXA" | "FREELA" | "RETORNO_INVESTIMENTOS";

// -> CategoriaResponse ({ id, nome, tipo, totalDespesas, dataCriacao }). Toda
// categoria é fixa OU variável; toda despesa lançada nela herda esse tipo.
// `totalDespesas` só vem preenchido de verdade em GET /categorias (usado pra
// ranquear as mais usadas no seletor); aninhada em Despesa/LimiteCategoria
// sempre vem 0 (não é usada nesses contextos). `dataCriacao` pode vir null
// (categorias criadas antes desse campo existir, sem backfill).
export interface Categoria {
  id: number;
  nome: string;
  tipo: TipoCategoria;
  totalDespesas: number;
  dataCriacao: string | null; // "YYYY-MM-DDTHH:mm:ss" ou null
}

// -> CategoriaRequest ({ nome, tipo })
export interface CategoriaRequest {
  nome: string;
  tipo: TipoCategoria;
}

// -> DespesaResponse: repare que "categoria" chega ANINHADA (objeto), não como id.
// `tipo` é derivado da categoria (calculado no backend), não escolhido por despesa.
// `recorrente`: true quando esta despesa nasceu (ou foi gerada
// automaticamente) numa categoria FIXA — excluí-la também encerra a
// recorrência a partir de agora (meses passados ficam intactos).
// Como a despesa foi paga. Só o CREDITO aceita parcelamento.
export type FormaPagamento = "DEBITO" | "CREDITO";

export interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  data: string; // "YYYY-MM-DD", sempre a data real da compra/lançamento
  // Mês que conta pro orçamento — só preenchido em despesas vindas do Leitor
  // de fatura (mês em que a fatura é paga); null nas demais, caindo no
  // fallback do mês de `data`. Ver utils/despesasResumo.mesEfetivoDespesa.
  mesReferencia: string | null; // "YYYY-MM-DD" (primeiro dia do mês) ou null
  tipo: TipoCategoria;
  categoria: Categoria;
  recorrente: boolean;
  formaPagamento: FormaPagamento;
  // Parcelamento. Numa despesa não parcelada: 1, 1 e null. Numa compra em 3x,
  // cada mês tem a SUA despesa (1/3, 2/3, 3/3) e `valor` acima é o valor
  // daquela parcela, não o total da compra.
  parcelaNumero: number;
  parcelasTotal: number;
  parcelamentoId: number | null; // agrupa as parcelas da mesma compra
}

// -> DespesaRequest: aqui SIM mandamos só o categoriaId (tipo vem da categoria).
export interface DespesaRequest {
  descricao: string;
  valor: number;
  data: string; // "YYYY-MM-DD"
  categoriaId: number;
  mesReferencia?: string | null; // só o Leitor de fatura preenche
  formaPagamento?: FormaPagamento; // ausente = DEBITO
  // 1 a 12, e só com formaPagamento CREDITO. Aqui `valor` é o TOTAL da
  // compra: o backend divide e cria uma despesa por mês.
  parcelas?: number;
}

// -> TotalResponse ({ total }) — usado por /rendas/total.
export interface Total {
  total: number;
}

// -> RendaResponse. `recorrente`: true quando nasceu (ou foi gerada
// automaticamente) com tipo FIXA — mesma semântica de Despesa.recorrente.
export interface Renda {
  id: number;
  descricao: string;
  valor: number;
  mesReferencia: string; // "YYYY-MM-DD" (1º dia do mês, por convenção)
  tipo: TipoRenda;
  recorrente: boolean;
}

// -> RendaRequest
export interface RendaRequest {
  descricao: string;
  valor: number;
  mesReferencia: string; // "YYYY-MM-DD"
  tipo: TipoRenda;
}

// -> CdiAtualResponse: taxa CDI mais recente conhecida (Banco Central).
export interface CdiAtual {
  data: string; // "YYYY-MM-DD"
  taxaDiariaPercentual: number;
  taxaAnualizadaPercentual: number;
}

// -> InvestimentoCdbResponse: `valorAplicado` é o principal AINDA investido
// (reduz a cada resgate parcial). `dataResgate` só é preenchida quando o
// investimento é totalmente liquidado (aí some da lista de ativos).
// `objetivoId`/`objetivoDescricao` só vêm preenchidos quando este investimento
// está vinculado a uma meta (ver Objetivo.investimentoCdbId).
export interface InvestimentoCdb {
  id: number;
  descricao: string;
  valorAplicado: number;
  percentualCdi: number;
  dataAplicacao: string; // "YYYY-MM-DD"
  dataResgate: string | null;
  objetivoId?: number | null;
  objetivoDescricao?: string | null;
}

// -> InvestimentoCdbRequest
export interface InvestimentoCdbRequest {
  descricao: string;
  valorAplicado: number;
  percentualCdi: number;
  dataAplicacao: string; // "YYYY-MM-DD"
}

// -> PosicaoCdbResponse: quanto um investimento CDB ativo vale hoje.
export interface PosicaoCdb {
  valorAplicado: number;
  valorAtual: number;
  rendimentoBruto: number;
  diasCorridos: number;
  diasUteisRendidos: number;
}

// -> SimulacaoResgateResponse: `valorLiquido` é o que o usuário PEDIU pra
// receber (ou, no resgate total, o máximo possível) — é o que efetivamente
// cai na conta. `valorBrutoRetirado` é quanto sai de fato da posição pra
// cobrir esse líquido + os impostos (sempre >= valorLiquido).
export interface SimulacaoResgate {
  valorAtual: number;
  valorBrutoRetirado: number;
  rendimentoProporcional: number;
  diasCorridos: number;
  percentualIof: number;
  valorIof: number;
  percentualIr: number;
  valorIr: number;
  valorLiquido: number;
}

// -> ObjetivoResponse ({ id, descricao, incentivo, valorAlvo, valorAtual, dataAlvo, investimentoCdbId, investimentoCdbDescricao })
// Quando `investimentoCdbId` está preenchido, `valorAtual` é a posição ATUAL
// do investimento (calculada ao vivo pelo backend), não o saldo de aportes.
export interface Objetivo {
  id: number;
  descricao: string;
  incentivo?: string | null; // mini descrição/motivação (opcional)
  valorAlvo: number;
  valorAtual: number;
  dataAlvo: string; // "YYYY-MM-DD"
  investimentoCdbId?: number | null;
  investimentoCdbDescricao?: string | null;
}

// -> ObjetivoRequest ({ descricao, incentivo, valorAlvo, dataAlvo })
export interface ObjetivoRequest {
  descricao: string;
  incentivo?: string | null;
  valorAlvo: number;
  dataAlvo: string; // "YYYY-MM-DD"
}

// -> AporteResponse: um aporte individual (linha do tempo do objetivo).
export interface Aporte {
  id: number;
  valor: number;
  data: string; // "YYYY-MM-DD"
}

// -> AporteRequest ({ valor, data }); data é opcional (backend usa hoje se ausente).
export interface AporteRequest {
  valor: number;
  data?: string; // "YYYY-MM-DD"
}

// -> LimiteCategoriaResponse: teto FIXO por categoria (não tem mês).
export interface LimiteCategoria {
  id: number;
  valorLimite: number;
  categoria: Categoria; // ANINHADA (como em Despesa)
  // Vigência: o limite vale nos meses [mesInicio, mesFim). Criado no mês em
  // que foi adicionado (não vale para os anteriores) e encerrado no mês em
  // que foi excluído (os anteriores continuam com ele).
  mesInicio: string; // "YYYY-MM-DD" (1º dia do mês)
  mesFim: string | null; // null = ainda vigente
  // Status do mês, já embutido na LISTAGEM (o backend calcula o gasto de
  // todas as categorias numa consulta só). Vem null nas respostas de criar e
  // editar, onde a tela recarrega a lista logo em seguida.
  valorGasto: number | null;
  estourado: boolean | null;
}

// -> LimiteCategoriaRequest: aqui mandamos só o categoriaId.
export interface LimiteCategoriaRequest {
  valorLimite: number;
  categoriaId: number;
  // Mês em foco na tela: define de quando o limite passa a valer (criação)
  // ou de quando o novo valor entra em vigor (edição). Ausente = mês atual.
  mesReferencia?: string; // "YYYY-MM-DD" (1º dia do mês)
}

// -> StatusLimiteResponse ({ valorLimite, valorGasto, estourado }).
export interface StatusLimite {
  valorLimite: number;
  valorGasto: number;
  estourado: boolean;
}

// -> ResumoMensal (relatório): um ponto do gráfico de comparação mês a mês
// (usado pelo gráfico "Economia nos últimos meses" da Home).
export interface ResumoMensal {
  mes: string; // "YYYY-MM-DD" (1º dia do mês)
  totalRenda: number;
  totalDespesas: number;
  economia: number;
}
