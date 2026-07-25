import { api } from "./client";
import type {
  InvestimentoCdb,
  InvestimentoCdbRequest,
  PosicaoCdb,
  SimulacaoResgate,
} from "../types/financas";

// GET /api/investimentos-cdb -> todos os investimentos do usuário (ativos e encerrados).
export async function listarInvestimentosCdb(): Promise<InvestimentoCdb[]> {
  const { data } = await api.get<InvestimentoCdb[]>("/investimentos-cdb");
  return data;
}

// POST /api/investimentos-cdb -> 201 com o investimento criado.
export async function criarInvestimentoCdb(
  req: InvestimentoCdbRequest,
): Promise<InvestimentoCdb> {
  const { data } = await api.post<InvestimentoCdb>("/investimentos-cdb", req);
  return data;
}

// PUT /api/investimentos-cdb/{id} -> só permitido enquanto ativo.
export async function atualizarInvestimentoCdb(
  id: number,
  req: InvestimentoCdbRequest,
): Promise<InvestimentoCdb> {
  const { data } = await api.put<InvestimentoCdb>(`/investimentos-cdb/${id}`, req);
  return data;
}

// DELETE /api/investimentos-cdb/{id} -> 204 (sem corpo).
export async function excluirInvestimentoCdb(id: number): Promise<void> {
  await api.delete(`/investimentos-cdb/${id}`);
}

// GET /api/investimentos-cdb/{id}/posicao -> quanto vale hoje (só ativos).
export async function posicaoInvestimentoCdb(id: number): Promise<PosicaoCdb> {
  const { data } = await api.get<PosicaoCdb>(`/investimentos-cdb/${id}/posicao`);
  return data;
}

// POST /api/investimentos-cdb/{id}/investir-mais {valor} -> aporta mais
// dinheiro num investimento já existente.
export async function investirMaisCdb(
  id: number,
  valor: number,
): Promise<InvestimentoCdb> {
  const { data } = await api.post<InvestimentoCdb>(
    `/investimentos-cdb/${id}/investir-mais`,
    { valor },
  );
  return data;
}

// POST /api/investimentos-cdb/{id}/simular-resgate {valor} -> `valor` é
// quanto o usuário quer RECEBER líquido. Prévia de IOF/IR; não altera nada.
export async function simularResgateCdb(
  id: number,
  valor: number,
): Promise<SimulacaoResgate> {
  const { data } = await api.post<SimulacaoResgate>(
    `/investimentos-cdb/${id}/simular-resgate`,
    { valor },
  );
  return data;
}

// POST /api/investimentos-cdb/{id}/resgatar {valor} -> efetiva o resgate
// parcial; cria uma Renda no mês do resgate com o valor líquido.
export async function resgatarInvestimentoCdb(
  id: number,
  valor: number,
): Promise<SimulacaoResgate> {
  const { data } = await api.post<SimulacaoResgate>(
    `/investimentos-cdb/${id}/resgatar`,
    { valor },
  );
  return data;
}

// POST /api/investimentos-cdb/{id}/simular-resgate-total -> prévia do
// resgate TOTAL (encerra o investimento), sem precisar informar valor.
export async function simularResgateTotalCdb(id: number): Promise<SimulacaoResgate> {
  const { data } = await api.post<SimulacaoResgate>(
    `/investimentos-cdb/${id}/simular-resgate-total`,
  );
  return data;
}

// POST /api/investimentos-cdb/{id}/resgatar-total -> efetiva o resgate total.
export async function resgatarTotalCdb(id: number): Promise<SimulacaoResgate> {
  const { data } = await api.post<SimulacaoResgate>(
    `/investimentos-cdb/${id}/resgatar-total`,
  );
  return data;
}
