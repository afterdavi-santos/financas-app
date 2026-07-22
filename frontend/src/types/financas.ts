// Espelha os DTOs do backend (pacote com.financas.app.dto), como types/auth.ts.
// LocalDate (Java) vira string "YYYY-MM-DD" no JSON; BigDecimal vira number.

// -> enum TipoDespesa (FIXA | EXTRAORDINARIA)
export type TipoDespesa = "FIXA" | "EXTRAORDINARIA";

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
