// Espelha os DTOs do backend (pacote com.financas.app.dto), como types/auth.ts.
// LocalDate (Java) vira string "YYYY-MM-DD" no JSON; BigDecimal vira number.

// -> enum TipoDespesa (FIXA | EXTRAORDINARIA)
export type TipoDespesa = "FIXA" | "EXTRAORDINARIA";

// -> enum TipoRenda (FIXA | FREELA | RETORNO_INVESTIMENTOS)
export type TipoRenda = "FIXA" | "FREELA" | "RETORNO_INVESTIMENTOS";

// -> CategoriaResponse ({ id, nome })
export interface Categoria {
  id: number;
  nome: string;
}

// -> CategoriaRequest ({ nome })
export interface CategoriaRequest {
  nome: string;
}

// -> DespesaResponse: repare que "categoria" chega ANINHADA (objeto), não como id.
export interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  data: string; // "YYYY-MM-DD"
  tipo: TipoDespesa;
  categoria: Categoria;
}

// -> DespesaRequest: aqui SIM mandamos só o categoriaId.
export interface DespesaRequest {
  descricao: string;
  valor: number;
  data: string; // "YYYY-MM-DD"
  tipo: TipoDespesa;
  categoriaId: number;
}

// -> TotalResponse ({ total }) — usado por /rendas/total.
export interface Total {
  total: number;
}

// -> RendaResponse ({ id, descricao, valor, mesReferencia, tipo })
export interface Renda {
  id: number;
  descricao: string;
  valor: number;
  mesReferencia: string; // "YYYY-MM-DD" (1º dia do mês, por convenção)
  tipo: TipoRenda;
}

// -> RendaRequest ({ descricao, valor, mesReferencia, tipo })
export interface RendaRequest {
  descricao: string;
  valor: number;
  mesReferencia: string; // "YYYY-MM-DD"
  tipo: TipoRenda;
}

// -> ObjetivoResponse ({ id, descricao, valorAlvo, valorAtual, dataAlvo })
export interface Objetivo {
  id: number;
  descricao: string;
  valorAlvo: number;
  valorAtual: number;
  dataAlvo: string; // "YYYY-MM-DD"
}

// -> ObjetivoRequest ({ descricao, valorAlvo, dataAlvo })
export interface ObjetivoRequest {
  descricao: string;
  valorAlvo: number;
  dataAlvo: string; // "YYYY-MM-DD"
}

// -> LimiteCategoriaResponse: categoria chega ANINHADA (como em Despesa).
export interface LimiteCategoria {
  id: number;
  valorLimite: number;
  mesReferencia: string; // "YYYY-MM-DD" (1º dia do mês)
  categoria: Categoria;
}

// -> LimiteCategoriaRequest: aqui mandamos só o categoriaId.
export interface LimiteCategoriaRequest {
  valorLimite: number;
  mesReferencia: string; // "YYYY-MM-DD"
  categoriaId: number;
}

// -> StatusLimiteResponse ({ valorLimite, valorGasto, estourado }).
export interface StatusLimite {
  valorLimite: number;
  valorGasto: number;
  estourado: boolean;
}

// -> ResumoMensal (relatório): um ponto do gráfico de comparação mês a mês.
export interface ResumoMensal {
  mes: string; // "YYYY-MM-DD" (1º dia do mês)
  totalRenda: number;
  totalDespesas: number;
  economia: number;
}

// -> ResumoAnual (relatório): um ponto do gráfico de comparação ano a ano.
export interface ResumoAnual {
  ano: number;
  totalRenda: number;
  totalDespesas: number;
  economia: number;
}
