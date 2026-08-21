-- V3 - vigencia dos limites de categoria.
--
-- Ate aqui o limite era ATEMPORAL: uma linha por (usuario, categoria), valendo
-- pra qualquer mes consultado - inclusive meses anteriores a sua criacao - e
-- excluir apagava a linha, o que reescrevia o passado (um mes que estourou o
-- teto passava a constar sem teto nenhum).
--
-- Agora cada linha e uma VIGENCIA, no intervalo semiaberto
-- [mes_inicio, mes_fim):
--   * mes_inicio - primeiro mes em que o limite vale (mes em que foi criado).
--   * mes_fim    - primeiro mes em que ele JA NAO vale. NULL = vigente ate
--                  segunda ordem. Excluir um limite nao apaga a linha: carimba
--                  mes_fim com o mes em foco, e os meses anteriores continuam
--                  com o teto que realmente valia neles.
--
-- Semiaberto (mes_fim exclusivo) e o que permite `mes_fim` de uma vigencia ser
-- igual ao `mes_inicio` da seguinte quando o valor e editado, sem sobreposicao
-- nem buraco de um mes entre as duas.

ALTER TABLE public.limite_categoria
    ADD COLUMN mes_inicio date,
    ADD COLUMN mes_fim date;

-- Backfill dos limites que ja existem. A tabela nao guarda data de criacao, e
-- a semantica antiga era "vale desde sempre" - entao a data sentinela antiga e
-- o que PRESERVA o comportamento atual desses limites, em vez de encolher a
-- validade deles retroativamente na migracao.
UPDATE public.limite_categoria
SET mes_inicio = DATE '1970-01-01'
WHERE mes_inicio IS NULL;

ALTER TABLE public.limite_categoria
    ALTER COLUMN mes_inicio SET NOT NULL;

-- Vigencia sempre em mes fechado (dia 1) e nunca vazia nem invertida. Sem
-- isto, um mes_fim <= mes_inicio criaria uma vigencia que nao vale pra mes
-- nenhum e ficaria invisivel na tela, mas ocupando a categoria.
ALTER TABLE public.limite_categoria
    ADD CONSTRAINT ck_limite_vigencia_dia_um CHECK (
        EXTRACT(DAY FROM mes_inicio) = 1
        AND (mes_fim IS NULL OR EXTRACT(DAY FROM mes_fim) = 1)
    ),
    ADD CONSTRAINT ck_limite_vigencia_ordem CHECK (
        mes_fim IS NULL OR mes_fim > mes_inicio
    );

-- Toda consulta de limite agora e "qual vigencia desta categoria cobre o mes
-- X" - sempre por usuario + categoria, filtrando pelo intervalo.
CREATE INDEX idx_limite_categoria_vigencia
    ON public.limite_categoria USING btree (usuario_id, categoria_id, mes_inicio);
