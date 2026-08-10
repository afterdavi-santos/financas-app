import { api } from "./client";
import type { ProcessarFaturaResponse } from "../types/leituraFatura";

// POST /api/leitura-fatura/processar (multipart) -> itens extraídos do CSV
// da fatura (já com sinal de duplicata/sugestão de categoria), todos com
// `mesReferencia` = `mes` (mês em que a fatura está sendo paga/subida — TODA
// despesa da fatura conta nesse mês no orçamento, independente da data real
// de cada compra) + itens ignorados (estornos/reembolsos/pagamento, valor <=
// 0 — nunca são despesas). Nada é persistido nesse passo — só depois de
// POST /despesas/lote.
export async function processarFatura(arquivo: File, mes: string): Promise<ProcessarFaturaResponse> {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  formData.append("mes", mes);
  // A instância `api` fixa Content-Type: application/json por padrão — aqui
  // precisa ser undefined pra o navegador montar o multipart/form-data com o
  // boundary certo sozinho (setar "multipart/form-data" na mão, sem
  // boundary, quebra o parsing no backend).
  const { data } = await api.post<ProcessarFaturaResponse>("/leitura-fatura/processar", formData, {
    headers: { "Content-Type": undefined },
  });
  return data;
}
