# Backend — Gestão de Finanças Pessoais

Java 21 + Spring Boot 4.1 · Spring Web, Data JPA, Security · PostgreSQL 16 · Flyway · Maven.
Pacote raiz `com.financas.app`, em `src/main/java`.

Ver também: [FRONTEND.md](FRONTEND.md) · [SEGURANCA.md](SEGURANCA.md) · [COMO-RODAR.md](COMO-RODAR.md)

---

## 1. O que é o produto

App web de finanças pessoais, criado para uma dor real do autor: a planilha de Excel
registrava só o valor, sem contexto, e o "porquê" do gasto se perdia. Uso individual hoje;
irmão e cunhada no futuro próximo. **Não é SaaS multi-tenant** — cada pessoa tem conta
própria com dados totalmente isolados por `usuario_id`.

**MVP completo e funcionando**: login JWT, categorias personalizáveis (fixas/variáveis),
despesas e rendas (com recorrência automática das fixas), economia do mês, limites por
categoria com alerta de estouro, gráficos, objetivos de economia, investimento CDB com CDI
real do Banco Central, e leitor de fatura Nubank (CSV).

**Fora de escopo, explicitamente**: Open Finance/integração bancária, multi-tenant de
verdade (cobrança, planos), compartilhamento de dados entre usuários.

**Backlog**: deploy em nuvem (Supabase como Postgres gerenciado + Render/Railway/Fly.io —
sem usar Auth/Storage do Supabase, que duplicaria o Spring Security), anexo de comprovante.

---

## 2. Padrões que valem para toda a camada Service

- **Todo método recebe `usuarioId` explícito.** É assim que o isolamento de dados acontece.
- **`buscarOuFalhar(id, usuarioId)`** — método privado que busca a entidade e confere o dono.
  Não existir e ser de outro usuário lançam **a mesma** `RecursoNaoEncontradoException`, de
  propósito: tratar diferente vazaria para um usuário que o registro de outro existe.
- Services trabalham direto com entidades JPA; DTOs de resposta só quando o cálculo é
  complexo (ex.: `InvestimentoCdbService`).
- `Specification.where(spec)` está **deprecado** desde Spring Data JPA 3.5 — use a spec base
  direto: `DespesaSpecification.comUsuario(id).and(...)`.

## 3. Services

**UsuarioService** — cadastro (e-mail único, senha em BCrypt), autenticação, e a página de
Configurações: perfil, troca de senha (exige a atual) e foto (guardada como `bytea` no
próprio `Usuario`, validada por tipo/tamanho).

**CategoriaService** — CRUD. Toda categoria tem `tipo` (FIXA/VARIAVEL) e as despesas herdam
esse tipo. `excluir(..., cascata)`: sem cascata, recusa com 409 se houver despesa/limite
vinculado; com cascata, apaga os dependentes antes. **Busca por similaridade**
(`buscarSemelhantes`) via extensão `pg_trgm`, limiar 0.35 (acima do padrão 0.3 — nomes de
categoria são curtos e 0.3 dá falso positivo); alimenta o aviso de nome parecido no front.

**DespesaService** — o service mais denso do projeto.

- **Tipo é derivado da categoria**, nunca campo próprio da despesa.
- **Recorrência mensal automática**: despesa criada em categoria FIXA nasce ligada a uma
  `RecorrenciaDespesa` própria (série independente — "Assinaturas" pode ter Netflix e
  Spotify separados). Um **catch-up preguiçoso** gera as linhas dos meses que faltam ao
  listar/somar, copiando descrição e valor da ocorrência mais recente — por isso editar a
  ocorrência atual já vira a base dos próximos meses. Excluir a mais recente encerra a série
  (`ativa=false`); meses passados nunca são tocados.
- **Catch-up vai até o mês consultado**, não até hoje: o `fim` do período pedido também diz
  até onde materializar. Sem isso a despesa fixa sumia ao navegar para um mês futuro. Teto
  de adiantamento em `util/JanelaCatchUp` (12 meses, e nunca recua antes do mês atual).
- **Três camadas contra duplicar a série** (o bug aconteceu de verdade: 2 linhas por mês):
  lock pessimista em `travarAtivasDoUsuario`, checagem `existsBy...` pelo **mês** de `data`
  (não pela data exata — o dia pode ter sido editado), e índice único no banco como rede final.
- **`mesReferencia`** — "mês que conta pro orçamento", desacoplado de `data` (data real da
  compra). Só o leitor de fatura preenche; despesas manuais ficam `null` e caem no fallback
  do mês de `data`. `DespesaSpecification.comPeriodo` filtra por `COALESCE(mesReferencia,
  data)`, o que propaga a regra para todos os cálculos sem tocar em cada método. `atualizar()`
  nunca sobrescreve `mesReferencia`.
- **Forma de pagamento e parcelamento** (ver seção 5).

**RendaService** — mesmo mecanismo de recorrência das despesas, para `tipo == FIXA` (via
`RecorrenciaRenda`, sem clamping de dia: `mesReferencia` é sempre dia 1). Múltiplas rendas
no mesmo mês são permitidas. `atualizar()` sincroniza a série com o tipo.

**ObjetivoService** — CRUD + aportes (cada aporte é uma linha em `Aporte`, não um incremento
de `valorAtual`) + vínculo com `InvestimentoCdb`. Vinculado, `valorAtual` passa a ser a
posição **ao vivo** do investimento e aportar manualmente fica bloqueado.

**InvestimentoCdbService** — cada investimento é um container de lotes (`AporteCdb`): o
aporte inicial e cada "investir mais" viram um lote com seu próprio relógio de rendimento,
para que aportar nunca apague rendimento já acumulado. Aplica `fatorCdi ^ (percentualCdi/100)`
(convenção de mercado para "% do CDI"). Resgate consome lotes em FIFO com gross-up de IOF/IR
regressivos (`util/ImpostosCdb`) e cria uma `Renda` automática do tipo
`RETORNO_INVESTIMENTOS` — CDB só vira renda quando efetivamente resgatado.

**CdiService** — cache local (`CdiDiario`) da taxa CDI diária do Banco Central (série SGS 12,
via `BcbCdiClient`). Backfill preguiçoso em pedaços de ~1 ano, cada um com cooldown de 20 min
em memória, para não martelar o BCB quando não há dado novo.

**LimiteCategoriaService** — teto de gasto por categoria, **com vigência** (ver seção 6).

**RelatorioService** — sem entidade própria: junta renda e despesa para economia do mês e
comparação mês a mês.

**LeituraFaturaService** — leitor de fatura Nubank em **CSV** (o app exporta `date,title,amount`;
não é PDF). Valida extensão/tamanho, separa linhas com valor ≤ 0 (estorno, reembolso,
"Pagamento recebido" — nunca despesa) das importáveis, busca candidatas a duplicata numa
janela de ±90 dias e devolve tudo para revisão. **Nada é persistido aqui**, só depois do
`POST /despesas/lote`; o arquivo original não é guardado.

**Utilitários puros** (`util/`, sem Spring, testáveis sem mock): `ParserFaturaNubank` (CSV com
valor em formato BR), `DetectorDuplicidadeFatura` (4 níveis — ALTISSIMA data+valor+descrição,
ALTA valor + data ±2 dias, MEDIA valor + descrição parecida por Levenshtein, BLOCO contra um
grupo "(Nx)" já importado), `ImpostosCdb`, `JanelaCatchUp`, `TetoDeListagem`.

---

## 4. Camada Web

Controllers em `web/`, DTOs em `dto/`. Padrão: `XRequest` (record com Bean Validation) +
`XResponse` (record), com `toEntity`/`toResponse` privados estáticos **dentro do próprio
controller** — sem mapper genérico.

O usuário logado vem **sempre** de `@AuthenticationPrincipal UsuarioAutenticado`, nunca de
path ou query param.

| Controller | Rotas |
|---|---|
| `AuthController` | `/api/auth` — `POST /registrar`, `POST /login`. **Únicas rotas públicas.** |
| `CategoriaController` | CRUD, `DELETE /{id}?cascata=`, `GET /semelhantes?nome=` |
| `DespesaController` | CRUD, `GET /` com filtros, `GET /total`, `POST /lote` (leitor de fatura, tudo ou nada) |
| `RendaController` | CRUD, `GET /total`, `GET /` com `inicio`/`fim` |
| `ObjetivoController` | CRUD + `/{id}/aportes` + `/{id}/investimento-cdb` |
| `InvestimentoCdbController` | CRUD, `/{id}/posicao`, `/investir-mais`, `/simular-resgate`, `/resgatar` |
| `LimiteCategoriaController` | CRUD (com `mes`), `GET /status?categoriaId&mesReferencia` |
| `CdiController` | `GET /atual` |
| `RelatorioController` | `GET /economia`, `GET /comparar-meses` |
| `UsuarioController` | `/api/perfil` — `GET /me`, `PUT /`, `PUT /senha`, `PUT`/`DELETE /foto` |
| `LeituraFaturaController` | `POST /processar` (multipart) |

`GlobalExceptionHandler` (`@RestControllerAdvice`) padroniza tudo em `ErrorResponse`:
404 para recurso não encontrado; 409 para conflitos (e-mail já cadastrado, limite duplicado,
categoria em uso, investimento já vinculado); 400 para operação inválida, `@Valid`, foto e
fatura inválidas; 401 para credenciais.

**`PerfilResponse.fotoBase64` já vem como data URI** — o front usa direto num `<img src>`.
Um endpoint binário exigiria mandar o header `Authorization` num `<img>`, o que não dá.

---

## 5. Forma de pagamento e parcelamento (despesas)

`Despesa.formaPagamento` é `DEBITO` ou `CREDITO` (enum `FormaPagamento`, coluna
`varchar(20)`). Só o crédito aceita parcelamento, de 1 a 12.

**Uma compra em 3x vira TRÊS despesas**, uma por mês — não uma linha com rótulo "3x". É isso
que faz o orçamento dos meses seguintes já enxergar a parcela. O valor enviado é sempre o
**total** da compra; o service divide.

- O resto da divisão vai inteiro na **primeira** parcela (R$ 100 em 3x = 33,34 + 33,33 +
  33,33), para a soma bater com o total desde o primeiro mês.
- As parcelas são amarradas por `parcelamentoId`, que é **o id da primeira parcela** — sem
  sequence separada. Ela é gravada, e o id dela carimba o grupo inteiro.
- `data` avança de mês em mês (`plusMonths` já resolve 31/jan → 28/fev). `mesReferencia`
  acompanha quando existe.
- **Excluir uma parcela exclui a compra inteira.** Uma parcela isolada não é uma despesa que
  exista no mundo real, e deixar 1/3 e 3/3 sem a 2/3 não descreve nada.
- **Editar** propaga descrição, categoria e forma de pagamento para todas as parcelas (são
  da compra); valor e data ficam só na parcela editada (é ajuste pontual). O número de
  parcelas não muda pela edição — para isso, exclua e lance de novo.
- **Categoria FIXA não aceita parcelamento**, e a recusa é explícita (400). As duas coisas
  ocupam os meses seguintes de formas incompatíveis: a série fixa repete sem fim, o
  parcelamento acaba na última parcela. Juntas, a mesma compra cairia duas vezes por mês.
  Crédito em categoria fixa é válido — só precisa ser 1x (uma assinatura, por exemplo).
- **No leitor de fatura a escolha é do lote inteiro**: jogar a fatura no mês seguinte é dizer
  que ela ainda vai ser paga (crédito); escolher o mês da própria fatura é tratá-la como
  quitada naquele mês (débito). Os itens entram com 1 parcela — o CSV do Nubank já traz cada
  parcela como uma linha própria.

Dois `CHECK` no banco sustentam as regras para qualquer escrita, não só pela API:
parcelas entre 1 e 12 com `parcela_numero` dentro do intervalo, e parcelamento só no crédito.

---

## 6. Vigência dos limites de categoria

Um limite **não é atemporal**. Cada linha de `limite_categoria` é uma vigência no intervalo
semiaberto `[mesInicio, mesFim)` — vale para todo mês `m` com `mesInicio <= m < mesFim`, e
`mesFim` nulo significa "ainda vigente". Datas sempre no primeiro dia do mês.

- **Criar** abre a vigência no mês em foco na tela. Meses anteriores continuam sem teto: um
  limite criado hoje não pode julgar o que já foi gasto.
- **Excluir não apaga a linha** — carimba `mesFim` com o mês em foco. Apagar reescreveria o
  passado, fazendo um mês que estourou o teto constar como se nunca tivesse tido limite. O
  DELETE real só acontece quando o limite foi criado e excluído no mesmo mês (não há
  histórico a preservar).
- **Editar o valor** encerra a vigência atual e abre outra com o valor novo: maio e junho
  seguem com R$ 500, julho em diante vai a R$ 700. Editado no próprio mês de início, corrige
  no lugar — abrir vigência nova ali geraria uma de zero mês, que o `CHECK` recusa.
- Listagem e status consultam a vigência que cobre o mês pedido. Fora dela, a categoria
  simplesmente não tem teto naquele mês (404, que o front lê como "sem limite").

O intervalo é semiaberto justamente para o `mesFim` de uma vigência poder ser igual ao
`mesInicio` da seguinte, sem sobreposição nem buraco de um mês.

**A listagem já vem com o status.** `listarComStatus` devolve cada limite vigente junto do
quanto foi gasto na categoria naquele mês, calculado por **uma** consulta agregada
(`DespesaService.somarPorCategoriaNoPeriodo`). Antes, a tela pedia a lista e depois o status
de cada limite numa requisição própria — com 5 limites eram 7 viagens de rede em duas ondas
encadeadas, cada uma pagando a latência inteira e disparando o catch-up de recorrências de
novo. Categoria sem gasto não aparece no resultado agregado, e a ausência é lida como zero.
Sem nenhum limite vigente, a soma nem é consultada: seria um catch-up à toa.

---

## 7. Schema e migrações

**Flyway** manda no schema (`src/main/resources/db/migration`). `spring.jpa.hibernate.ddl-auto`
é **`validate`**: o Hibernate confere entidades contra o schema no start e **recusa subir** se
discordarem. Mudou entidade? A migração é obrigatória — senão o app não sobe, que é o objetivo.

| Migração | O quê |
|---|---|
| `V1__baseline.sql` | Schema que já existia antes do Flyway, mais `pg_trgm` e os índices únicos de recorrência (antes criados por `ApplicationRunner`, hoje removidos) |
| `V2__forma_pagamento_e_parcelamento.sql` | `forma_pagamento`, `parcela_numero`, `parcelas_total`, `parcelamento_id` + os dois CHECK |
| `V3__vigencia_limite_categoria.sql` | `mes_inicio`/`mes_fim` nos limites + CHECK de ordem e dia 1 |

`baseline-on-migrate=true` é o que permite adotar Flyway num banco que já existia: em vez de
tentar rodar o V1 sobre um schema pronto (e falhar com "relation already exists"), o Flyway
carimba o banco como "já está na versão 1" e aplica do V2 em diante. Num banco vazio — banco
novo, ou o Postgres efêmero dos testes — o V1 roda de verdade. Mesmo arquivo, os dois casos
corretos.

**Limite conhecido do `validate`, medido e não suposto:** ele **não** checa precisão e escala
de coluna numérica. Entidade em `precision=38, scale=2` contra coluna `numeric(9,6)` sobe sem
reclamar. Ele pega coluna/tabela faltando e tipo trocado. Quem pega esse caso é o
`EsquemaRealTest`, que grava `0.052531` e lê de volta do banco.

---

## 8. Testes

**316 testes**, todos passando. Services e utils com Mockito + AssertJ; controllers com
`@WebMvcTest` (um arquivo por controller); persistência com **Testcontainers e Postgres 16 de
verdade**.

**Não é H2, e o motivo é concreto**: o schema usa `pg_trgm` e um índice funcional com
`date_trunc()`, e o modo PostgreSQL do H2 não suporta nenhum dos dois. Teste verde no H2 e
vermelho no Postgres é pior que teste nenhum. O container é `static` — sobe uma vez por suíte
(~20s), não por classe, e o schema vem das **mesmas migrações do Flyway que rodam em produção**.
É isso que torna esses testes uma prova.

**Pegadinha de `@WebMvcTest` + Security:** `JwtAuthenticationFilter` é um bean `Filter`, então
o slice o inclui automaticamente e ele quebra (suas dependências não estão no slice). Exclua-o
via `excludeFilters` e simule o usuário com
`SecurityMockMvcRequestPostProcessors.authentication(...)`. Sem uma `SecurityConfig` própria no
slice, o Boot usa a cadeia padrão (nega tudo, CSRF ligado) — por isso POST/DELETE precisam
também de `.with(csrf())`.

**Teto de listagem** (`TetoDeListagem.MAXIMO = 2000`): estourar é **400** com mensagem pedindo
para reduzir o intervalo, nunca página parcial. Não virou `Pageable` porque todo consumidor
destas listagens é agregado, não paginado — devolver a página 0 faria os gráficos plotarem um
recorte **em silêncio**, trocando um problema de performance por números errados na tela. A
conferência é um `COUNT` antes do `SELECT`, não um `size()` depois.
