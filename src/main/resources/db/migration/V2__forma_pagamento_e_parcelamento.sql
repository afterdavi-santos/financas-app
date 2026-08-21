-- V2 - forma de pagamento (debito/credito) e parcelamento das despesas.
--
-- forma_pagamento: DEBITO ("a vista") ou CREDITO. Tudo que ja existia vira
-- DEBITO, que e o que o app fazia implicitamente ate aqui.
--
-- parcelas_total / parcela_numero: uma compra parcelada nao vira uma linha
-- com um rotulo "3x" - ela materializa UMA despesa por mes (ver
-- DespesaService.criar), pra que o orcamento dos meses seguintes ja enxergue
-- a parcela. Numa despesa nao parcelada os dois valem 1.
--
-- parcelamento_id: agrupa as parcelas da MESMA compra, e vale o id da
-- primeira parcela do grupo (nao ha sequence propria: a primeira parcela e
-- gravada, e o id dela carimba o grupo inteiro, ela inclusive). Null quando a
-- despesa nao e parcelada. De proposito SEM foreign key para despesa(id):
-- excluir uma compra parcelada apaga as N linhas de uma vez, e uma FK
-- auto-referente so criaria ordem obrigatoria de delete sem proteger nada
-- que o service ja nao garanta.

ALTER TABLE public.despesa
    ADD COLUMN forma_pagamento character varying(20),
    ADD COLUMN parcela_numero integer,
    ADD COLUMN parcelas_total integer,
    ADD COLUMN parcelamento_id bigint;

-- Backfill antes do NOT NULL: as linhas que ja estao no banco nasceram todas
-- como despesa avulsa a vista.
UPDATE public.despesa
SET forma_pagamento = 'DEBITO',
    parcela_numero = 1,
    parcelas_total = 1
WHERE forma_pagamento IS NULL;

ALTER TABLE public.despesa
    ALTER COLUMN forma_pagamento SET NOT NULL,
    ALTER COLUMN parcela_numero SET NOT NULL,
    ALTER COLUMN parcelas_total SET NOT NULL;

-- O teto de 12 e a mesma regra do @Max(12) no DespesaRequest, aqui pra valer
-- tambem pra qualquer escrita que nao passe pela API.
ALTER TABLE public.despesa
    ADD CONSTRAINT ck_despesa_parcelas CHECK (
        parcelas_total BETWEEN 1 AND 12
        AND parcela_numero BETWEEN 1 AND parcelas_total
    );

-- Debito nunca parcela: parcelamento so existe no credito.
ALTER TABLE public.despesa
    ADD CONSTRAINT ck_despesa_parcela_exige_credito CHECK (
        parcelas_total = 1 OR forma_pagamento = 'CREDITO'
    );

-- Buscar as irmas de uma parcela (editar/excluir a compra inteira) e a unica
-- consulta por esta coluna, e so interessa a linha parcelada - dai o indice
-- parcial, que fica pequeno mesmo com a tabela cheia de despesa avulsa.
CREATE INDEX idx_despesa_parcelamento ON public.despesa USING btree (parcelamento_id)
    WHERE parcelamento_id IS NOT NULL;
