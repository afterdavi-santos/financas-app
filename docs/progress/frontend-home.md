# Frontend — Home/Dashboard Parte 1 (plano para retomar após /clear)

> Este arquivo é o guia da PRÓXIMA sessão. A autenticação já está pronta e
> verificada (ver `frontend-setup.md`). Aqui está o design acordado da home real,
> que substitui o placeholder atual ("Você está autenticado 🎉").

## Solicitações do usuário (o que ele pediu para a home)

- **Menu lateral** (sidebar) de navegação.
- No **topo da home**: botões "Adicionar despesa" e "Adicionar categoria".
- **Lista com as 3 últimas despesas**.
- Os **"principais macros"** (resumo do mês): decidimos = Renda, Despesas e Economia do mês.
- Aberto a sugestões; ir **por partes, acompanhando e aprendendo**.

Decisões fechadas:
- Adicionar despesa/categoria = **modal (popup)** na própria home (não sai da tela).
- **Parte 1 enxuta**: SEM gráfico ainda. Gráfico de gastos por categoria e
  comparativos mês a mês ficam para a **Parte 2**.

## Endpoints do backend que a home consome (já existem, testados)

- `GET /api/categorias` → `[{id, nome}]` (lista + alimenta o select da despesa).
- `POST /api/categorias` body `{nome}` → 201.
- `GET /api/despesas?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` → lista de despesas do mês.
- `POST /api/despesas` body `{descricao, valor, data, tipo, categoriaId}`,
  `tipo` = `"FIXA" | "EXTRAORDINARIA"` → 201.
- `GET /api/rendas/total?mesReferencia=YYYY-MM-DD` → `{total}` (renda do mês).
- **Economia = renda − despesas**, calculada no front (sem chamar `/api/relatorios/economia`).

Serialização: `valor` (BigDecimal) chega como número JSON; `data`/`mesReferencia`
(LocalDate) chegam como string `"YYYY-MM-DD"`.

## Arquivos a criar no frontend (Parte 1)

- `src/types/financas.ts` — `TipoDespesa`, `Categoria`, `CategoriaRequest`,
  `Despesa`, `DespesaRequest`, `Total` (espelham os DTOs Java, como `types/auth.ts`).
- `src/api/categorias.ts` — `listarCategorias()`, `criarCategoria(req)`.
- `src/api/despesas.ts` — `listarDespesas({inicio, fim})`, `criarDespesa(req)`.
- `src/api/rendas.ts` — `totalRenda(mesReferencia)`.
  (Todos reusam `api/client.ts`, que já injeta o `Authorization: Bearer` via interceptor.)
- `src/utils/datas.ts` — `primeiroDiaDoMesISO()`, `ultimoDiaDoMesISO()`, `hojeISO()`.
- `src/utils/moeda.ts` — `formatarBRL(valor)` (`Intl.NumberFormat` pt-BR/BRL).
- `src/components/Sidebar.tsx` — "Início" ativo; Despesas/Categorias/Rendas/
  Relatórios/Objetivos desabilitados ("em breve"); botão "Sair" (`logout()`).
  (Mostrar nome do usuário exigiria endpoint `/me` no backend — fora da Parte 1.)
- `src/components/Layout.tsx` — `flex`: `<Sidebar/>` + `<main><Outlet/></main>` (layout route).
- `src/components/Modal.tsx` — modal genérico (backdrop; fecha no X, clique fora, Esc).
- `src/components/StatCard.tsx` — card de macro (título + valor formatado), usado 3x.
- `src/components/NovaCategoriaModal.tsx` — form `{nome}`.
- `src/components/NovaDespesaModal.tsx` — form `{descricao, valor, data(=hoje),
  tipo(select), categoriaId(select)}`. Se não houver categoria, orientar a criar uma antes.
- `src/pages/HomePage.tsx` — substitui `DashboardPage.tsx` (remover este).
  `useEffect` carrega categorias + despesas do mês + renda; deriva total de despesas
  e economia. Topo com os 2 botões; 3 StatCards; seção "Últimas despesas" (3 mais
  recentes por `data` desc) com estado vazio. Ao salvar num modal: fecha + refetch.

## Ajuste de rotas

Refatorar `src/routes/ProtectedRoute.tsx` para guarda de layout com `<Outlet/>`:
`return isAuthenticated ? <Outlet/> : <Navigate to="/login" replace/>`.

`src/App.tsx`:
```
/login, /registrar → públicas
<Route element={<ProtectedRoute/>}>
  <Route element={<Layout/>}>
    <Route index element={<HomePage/>} />   // "/"
  </Route>
</Route>
```

## Padrões a manter
- `import type { ... }` para imports só de tipo (`verbatimModuleSyntax` ligado).
- Erros de API via `mensagemDeErro()` (`src/api/erros.ts`).
- Comentários sucintos explicando conceitos novos de React (usuário forte em backend).

## Verificação (depois de construir)
1. `cd frontend && npm run build` compila limpo.
2. Backend + Postgres + `npm run dev` no ar → logar cai na Home (não no placeholder).
3. Criar categoria → aparece no select de despesa.
4. Criar despesa → cards (Despesas/Economia) atualizam e ela aparece em "Últimas despesas".
5. Reload não desloga; `/` sem token → redireciona `/login`.

## Estado (atualizado 2026-07-21)

Parte 1 CONSTRUÍDA. Todos os arquivos acima foram criados; `DashboardPage.tsx`
removido; `ProtectedRoute` virou guarda de layout com `<Outlet/>`; `App.tsx`
usa rotas aninhadas `ProtectedRoute > Layout > index(HomePage)`.
`npm run build` compila limpo (tsc + vite, 95 módulos).

Detalhe de implementação vs. plano: `DespesaResponse` traz `categoria`
ANINHADA (`{id, nome}`), não `categoriaId` — o type `Despesa` reflete isso e a
lista "Últimas despesas" usa `d.categoria.nome`. `DespesaRequest` (envio) manda
`categoriaId`, como planejado.

VERIFICADO ponta a ponta (2026-07-21) com Postgres + `spring-boot:run` +
`npm run dev`, dirigindo o navegador real:
- registrar → redireciona pro /login com aviso verde "Conta criada!".
- login → cai na Home real (sidebar + 3 StatCards + últimas despesas), não no placeholder.
- criar categoria → modal fecha, refetch popula o select de despesa.
- criar despesa (R$ 150,50, Alimentação, Extraordinária) → cards Despesas/Economia
  atualizam (Economia -R$ 150,50 em vermelho) e a despesa aparece em "Últimas despesas".
- reload em `/` mantém logado; `/` sem token no localStorage → redireciona pro /login.
Parte 1 concluída e funcionando.

## Parte 1.5 (atualizado 2026-07-21): tipo de renda + páginas do menu

MUDANÇA DE BACKEND: `Renda` ganhou campo `tipo` (enum `TipoRenda`:
FIXA, FREELA, RETORNO_INVESTIMENTOS), `@NotNull` no `RendaRequest` e presente no
`RendaResponse`. `ddl-auto=update` adicionou a coluna com check constraint
automaticamente (backend reiniciado). 87 testes continuam passando (ajustado
`RendaControllerTest` para enviar `tipo`).

FRONTEND:
- Home agora tem 3 botões: "+ Adicionar renda" (verde, `NovaRendaModal`),
  despesa e categoria. Renda usa `<input type="month">` → envia `YYYY-MM-01`.
- Páginas do menu lateral CRIADAS e habilitadas na Sidebar:
  `DespesasPage` (mês atual, criar/excluir), `CategoriasPage` (criar/excluir),
  `RendasPage` (listar todas, criar/excluir), `ObjetivosPage` (barra de
  progresso, criar/aportar/excluir). Rotas aninhadas em `App.tsx` sob Layout.
- Novos utils `utils/rotulos.ts` (rótulos dos enums + `dataBR`/`mesBR`);
  HomePage refatorada para usá-los. Novos modais: `NovaRendaModal`,
  `NovoObjetivoModal`, `AportarModal`. Novo `PageHeader`.
- Exclusões usam `confirm()` do navegador. `npm run build` limpo (105 módulos),
  `npm run lint` só com aviso pré-existente no AuthContext.
- Verificação em navegador com o USUÁRIO (ele testa). Falta só Relatórios.

## Parte 2 — Relatórios + Limites (CONCLUÍDA e VERIFICADA em 2026-07-23)

Fecha o MVP do menu: os dois recursos que faltavam consumir do backend
(`RelatorioController` e `LimiteCategoriaController`) agora têm frontend.
Nenhuma mudança de backend foi necessária (todos os endpoints já existiam).

### Relatórios (gráficos Recharts)
- `api/relatorios.ts` — `compararMeses(inicio, fim)` (`GET /api/relatorios/comparar-meses`)
  e `compararAnos(anoInicio, anoFim)` (`GET /api/relatorios/comparar-anos`).
  (Não usei `/economia`; a economia já vem em cada `ResumoMensal`/`ResumoAnual`.)
- `pages/RelatoriosPage.tsx` — dois cards, cada um com um `ComposedChart`
  (Recharts 3): duas **barras** (Renda verde `#16a34a` × Despesas vermelho
  `#dc2626`) e uma **linha** de Economia (azul `#2563eb`) por cima. Seletores:
  "Mês a mês" (3/6/12 meses, default 6) e "Ano a ano" (2/3/5 anos, default 3).
  Componente interno `GraficoComparativo` reaproveitado nos dois. Mapeia a
  resposta para `{ rotulo, Renda, Despesas, Economia }` (chaves = séries).
  Tooltip formata BRL; eixo Y compacto ("R$ 1,5 mil"). `ResponsiveContainer`
  dentro de um `div h-72`.
- Tipos novos em `types/financas.ts`: `ResumoMensal`, `ResumoAnual`.
- Utils novos: `datas.primeiroDiaMesesAtrasISO(n)` (início do intervalo mensal)
  e `rotulos.mesCurtoBR("2026-07-01") -> "jul/26"` (eixo X).
- **Gotcha do Recharts 3**: o `formatter` do `<Tooltip>` tem tipagem estrita —
  o parâmetro `value` precisa aceitar `number | string | ReadonlyArray<...> |
  undefined` (o array é `readonly`), senão `tsc -b` quebra. Normalizado com
  `Number(value)`.

### Limites de gastos (CRUD + status)
- `api/limites.ts` — `listarLimites(mes)`, `statusLimite(categoriaId, mes)`
  (`GET /api/limites-categoria/status` → `{valorLimite, valorGasto, estourado}`),
  `criarLimite(req)`, `excluirLimite(id)`.
- `components/NovoLimiteModal.tsx` — form `{categoria(select), valorLimite,
  mês(input month)}`. Recebe `mesPadrao` (o mês em foco na página) como default.
  Sem categorias → bloqueia com aviso âmbar (padrão do `NovaDespesaModal`).
- `pages/LimitesPage.tsx` — seletor `<input type="month">` no header (recarrega
  no `onChange` via `useEffect([mes])`). Para cada limite do mês, faz
  `Promise.all` chamando `statusLimite` para saber o gasto. Cada card mostra
  categoria, "R$ gasto de R$ teto", **barra de progresso** (verde <80%, âmbar
  ≥80%, vermelho se estourou) e selo "Estourou". `LimiteCategoriaResponse` traz
  `categoria` ANINHADA (`{id, nome}`), como `Despesa`.
- Tipos novos: `LimiteCategoria`, `LimiteCategoriaRequest`, `StatusLimite`.

### Encaixe
- `App.tsx` — rotas `/limites` e `/relatorios` sob `Layout`.
- `Sidebar.tsx` — "Relatórios" saiu de *em breve* → ativo; adicionado "Limites".
  Agora TODOS os itens do menu estão ativos.

### Verificação (2026-07-23)
- `npm run build` limpo (tsc + vite, 672 módulos; aviso esperado de chunk >500 kB
  por causa do Recharts — não é erro).
- Smoke test da API via `curl` (registrar→login→categoria→despesa→limite→status→
  relatório): limite estourou certo (`valorGasto 300 > 250`, `estourado true`);
  comparar-meses retornou a série com economia -300 em julho.
- **Dirigido no navegador real** com dados semeados: Relatórios renderiza os dois
  gráficos; Limites mostra Mercado (300/250, barra vermelha cheia, "Estourou",
  120%) e Lazer (120/500, barra verde, 24%). Funcionando ponta a ponta.

### MVP do menu concluído. Próximos passos (definidos pelo usuário)
O usuário vai agora fazer **mudanças visuais** e **regras de negócio** que façam
mais sentido pra ele — este é o ponto de partida dessa próxima fase.

## Parte 3 — Regras de negócio e insights (CONCLUÍDA em 2026-07-24)

Fase de "mudanças que fazem sentido pro usuário". Quase tudo é **derivado no
frontend** a partir dos endpoints que já existiam; a única mudança de backend foi
tornar o limite **fixo por categoria** (ver abaixo). `npm run build`/`lint` limpos
(só o aviso pré-existente do `AuthContext`); 88 testes do backend passando.

### Despesas — tela de análise (`pages/DespesasPage.tsx`)
Título passou de "Despesas do mês" → **"Despesas"** e ganhou **seletor de mês**
(`<input type="month">`, padrão da `LimitesPage`). A página busca as despesas do
mês em foco **e do mês anterior** (para comparar) e mostra:
- **2 StatCards clicáveis**: total de despesas **Fixas** e **Extraordinárias** →
  clique abre um popup com o detalhamento agrupado por categoria.
- **Top 5 categorias** (só **extraordinárias**), cada linha clicável → mesmo popup.
- **⚠️ Ponto de atenção** (maior alta) e **🎉 Parabéns** (maior baixa) **vs. mês
  anterior**, comparando **só despesas extraordinárias**, exibindo **R$ e %**
  (categoria sem gasto no mês anterior aparece como "nova").
- Lista completa + excluir (comportamento antigo, mantido).
- Novos arquivos: `utils/despesasResumo.ts` (funções puras: `somaPorTipo`,
  `totalPorCategoria`, `topCategorias`, `variacaoCategorias`, `maiorAlta`,
  `maiorBaixa`) e `components/DetalheDespesasModal.tsx` (popup reutilizado nos 3
  cliques). `utils/datas.ts` ganhou helpers de mês parametrizado
  (`mesAtualYYYYMM`, `primeiroDiaDoMes`, `ultimoDiaDoMes`, `mesAnteriorYYYYMM`).
- `StatCard` ganhou prop opcional `onClick` (vira `<button>`); Home inalterada.
- `NovaDespesaModal` recebe `dataPadrao` para **lançar direto no mês em foco**
  (hoje se for o mês atual; dia 1 caso contrário).

### Objetivos — termômetro + "como chegar à meta" (`pages/ObjetivosPage.tsx`)
- **Termômetro em degradê vermelho→verde**: barra com gradiente cobrindo toda a
  largura + uma "tampa" cinza à direita revelando só até o **progresso**
  (`valorAtual/valorAlvo`).
- Bloco **"Como chegar à meta"** (cálculo em `utils/objetivos.ts`, função pura
  `planoObjetivo`, recalculada a cada render → dinâmica): `valorFaltante /
  mesesRestantes` = **aporte mensal**, e o **% da renda fixa** que isso representa
  (renda fixa = soma das rendas `tipo FIXA` do mês atual, buscadas via
  `listarRendas`). Trata: meta atingida, sem renda fixa (orienta cadastrar),
  `% > 100` (destaque + aviso) e prazo vencido.

### Edição de Objetivos e Limites
O backend já tinha `PUT` para os dois. Frontend: botão **Editar** nas páginas e os
modais `NovoObjetivoModal`/`NovoLimiteModal` viraram criação **e** edição (prefill +
`useEffect` de sincronização ao abrir). No limite, na edição a **categoria fica
travada** (o backend só atualiza o valor).

### Home — lembrete de mês, simular e aviso de estouro (`pages/HomePage.tsx`)
- **Lembrete de virada de mês**: banner "O mês virou! Deseja redefinir seus limites
  de despesas?" com "Sim, redefinir" (`navigate("/limites")`) e "Agora não".
  Mostrado **uma vez por mês** — controlado por `localStorage`
  (`financas.lembreteLimites` = último mês reconhecido). Aparece no início do mês e
  some após qualquer clique, até o mês seguinte.
- **Botão "Simular despesa"** → `components/SimularDespesaModal.tsx`: sem gravar
  nada, informa se um valor hipotético numa categoria **estoura o limite** (e por
  quanto) ou, se não, **quanto ainda sobra em R$ e %**. Categoria sem limite →
  avisa que não há teto.
- **Aviso ao lançar despesa** (`NovaDespesaModal`): ao escolher categoria + valor,
  busca o status do limite e mostra em tempo real, **vermelho** se vai estourar ou
  **verde** se fica dentro (não bloqueia salvar). Só aparece se a categoria tiver
  limite.
- Helper novo na API: `statusLimiteOuNulo` — o backend responde **404** quando a
  categoria não tem limite; esse wrapper devolve `null` nesse caso (ausência de
  limite não é erro), usado no aviso e na simulação.

### MUDANÇA DE BACKEND — limite fixo por categoria
Decisão do usuário: o limite deixou de ser por mês e virou **informação fixa/atual
por categoria**, editável a qualquer momento. Implicações:
- `LimiteCategoria` **sem `mesReferencia`**; repo `findByUsuarioId` /
  `findByUsuarioIdAndCategoriaId`; DTOs (`Request`/`Response`) sem o mês.
- `criar` recusa 2º limite na mesma categoria → nova `LimiteJaExisteException`
  (409). `verificarLimite` acha por categoria mas avalia o gasto **no mês pedido**
  (o front manda o mês atual).
- `GET /api/limites-categoria` **sem parâmetro** (lista todos).
- Frontend: `LimitesPage` **sem seletor de mês**; no "+ Novo limite" só aparecem
  categorias **sem limite ainda**; campo de mês removido do `NovoLimiteModal` e do
  `SimularDespesaModal`.
- **Dívida de banco (dev)**: `ddl-auto=update` não dropa colunas, então
  `limite_categoria.mes_referencia` continua existindo (órfã, nullable — inofensiva).
  Limpeza opcional: `ALTER TABLE limite_categoria DROP COLUMN mes_referencia;` (e
  deduplicar limites antigos por categoria, se houver).

### Verificação
`npm run build` + `npm run lint` limpos; `mvnw test` = **88 verdes**. Falta a
verificação ponta a ponta no navegador (o usuário costuma testar ele mesmo).

## Parte 4 — Sessão de login + histórico de aportes + incentivo (CONSTRUÍDA 2026-07-24)

Três pedidos do usuário: (1) resolver o problema do tempo limite de sessão;
(2) poder editar/remover aportes do objetivo, com um gráfico de linha do tempo;
(3) um campo de "incentivo" (mini descrição) no objetivo.

### Sessão de login (bug: app travava ao expirar)
Antes, `isAuthenticated = token !== null` — não checava expiração e não havia
tratamento de 401, então a sessão vencida deixava o app dando erro sem deslogar.
- Backend: `jwt.expiration-ms` de 24h → **2h** (7.200.000). Fácil de reverter.
- `utils/jwt.ts` novo: `tokenExpirado(token)` decodifica o payload (base64url) e
  compara `exp` com agora. Não valida assinatura (isso é do backend), só o prazo.
- `AuthContext`: no init, descarta o token do localStorage se já expirou → cai
  no /login em vez de sessão morta (cobre "voltei depois de 2h e recarreguei").
- `api/client.ts`: **interceptor de response**. Em 401 (fora de `/auth/*`), limpa
  o token e `window.location.assign("/login?expirada=1")` — cobre a sessão que
  vence com o app aberto. Ignora 401 de login/registro (é credencial inválida).
- `LoginPage`: lê `?expirada=1` (`useSearchParams`) e mostra aviso âmbar
  "Sua sessão expirou".

### Aportes viram registros individuais (MUDANÇA DE BACKEND)
Antes `aportar()` só somava em `Objetivo.valorAtual`, sem histórico. Agora:
- Nova entidade **`Aporte`** (id, valor, data, `@ManyToOne Objetivo`), tabela
  `aporte`, `AporteRepository.findByObjetivoIdOrderByDataAscIdAsc`.
- `AporteRequest` ganhou `data` (opcional → serviço usa hoje se null); novo
  `AporteResponse (id, valor, data)`.
- `ObjetivoService`: `aportar(usuarioId, objetivoId, valor, data)` cria o Aporte e
  ajusta `valorAtual` **por delta** (`+= valor`). Novos: `listarAportes`,
  `editarAporte` (delta = novoValor − antigo), `removerAporte` (`-= valor`).
  Delta em vez de recomputar do zero **preserva valorAtual legado** de objetivos
  que acumularam antes dos aportes existirem.
- `ObjetivoController`: `GET /{id}/aportes`, `PUT /{id}/aportes/{aporteId}`,
  `DELETE /{id}/aportes/{aporteId}`; `POST /{id}/aportar` mantido (agora passa a
  data). Checagem de posse: aporte tem que pertencer ao objetivo do usuário.
- Testes: `ObjetivoServiceTest`/`ObjetivoControllerTest` atualizados (construtor
  do service mudou; assinatura do aportar; novos casos). **Backend agora = 22
  testes nesses dois arquivos, todos verdes** (suíte total sobe de 88).
- **Dívida de dados (dev)**: objetivos com `valorAtual` legado NÃO têm registros
  de Aporte — o valor total é preservado, mas a linha do tempo só mostra os
  aportes novos. Para testar limpo, criar objetivo do zero.

### Frontend dos aportes
- `types/financas.ts`: `Aporte`, `AporteRequest`; `Objetivo`/`ObjetivoRequest`
  ganharam `incentivo?: string | null`.
- `api/objetivos.ts`: `aportarObjetivo(id, req)` (assinatura mudou p/ objeto com
  valor+data), `listarAportes`, `editarAporte`, `removerAporte`.
- `AportarModal`: agora tem campo **data** (default hoje) e reseta ao abrir.
- **`LinhaTempoAportesModal.tsx`** (novo): abre por objetivo (popup, sem trocar de
  página). Gráfico **Recharts `LineChart`** do valor **acumulado** por data +
  lista de aportes com **edição inline** (data+valor) e excluir. `onAlterado`
  refaz o fetch da página (valorAtual muda). `Modal` ganhou prop opcional
  `largura` (default `max-w-md`; aqui usa `max-w-2xl`) + scroll interno.
- `ObjetivosPage`: mostra o incentivo (itálico, índigo) sob a descrição; botões
  "Aportar" (azul) + "Linha do tempo" (cinza) lado a lado; renderiza o novo modal.

### Incentivo (mini descrição)
- Backend: campo `incentivo` (String, nullable) em `Objetivo` + `ObjetivoRequest`
  (sem validação, opcional) + `ObjetivoResponse`; `atualizar` seta o incentivo.
  `ddl-auto=update` cria a coluna sozinho.
- `NovoObjetivoModal`: `<textarea>` opcional "Incentivo" (prefill na edição;
  envia `null` quando vazio).

### Verificação
`mvnw test -Dtest=ObjetivoServiceTest,ObjetivoControllerTest` = **22 verdes**.
`npm run build` limpo (tsc + vite, 678 módulos; aviso de chunk do Recharts
esperado). `npm run lint` só com o aviso pré-existente do `AuthContext`.
**Falta a verificação ponta a ponta no navegador** e rodar a suíte de backend
completa (só rodei os 2 arquivos de Objetivo).

## Parte 5 — Rendas (ajustes) + Investimento CDB (CONSTRUÍDA e VERIFICADA em 2026-07-25)

Sessão longa, com bastante iteração no desenho do CDB (o usuário foi corrigindo o
rumo conforme via funcionando). O resultado final está descrito primeiro; as
decisões que foram **revertidas no caminho** ficam marcadas como tal, porque
explicam por que o código tem a forma que tem.

### Rendas — ajustes pequenos
- Rótulo `FREELA` → **"Renda variável"** (só o texto exibido; enum do backend
  continua `FREELA`, sem migração).
- **Editar renda** no frontend (`NovaRendaModal` virou criação **e** edição,
  mesmo padrão do `NovoObjetivoModal`) — o backend já tinha `PUT`, só faltava usar.
- `RendasPage` agora mostra **3 seções separadas por tipo** (Fixa / Renda
  variável / Retorno de investimentos) em vez de uma lista única.
- **`RETORNO_INVESTIMENTOS` saiu do `<select>`** de "Nova renda" — não dá mais
  pra criar esse tipo manualmente, só existe via resgate de um Investimento CDB
  (ver abaixo). A `<option>` só reaparece (escondida) se o registro **editado**
  já for desse tipo, pra não trocar o tipo dele silenciosamente ao salvar.

### Investimento CDB — desenho final

**Decisão do usuário: fica como aba/seção própria na Home ("Investimento CDB"),
separada de Renda.** Só vira um lançamento de Renda (e só soma no total do mês)
**quando é resgatado** — enquanto ativo, não conta como renda de nenhum mês.

*(Tentativa inicial, REVERTIDA: os campos de CDB (`investimentoCdb`,
`percentualCdi`, `dataAplicacao`, `dataResgate`) foram colocados dentro da
própria `Renda`, com `NovaRendaModal` ganhando um checkbox "É um CDB?". O
usuário decidiu que fazia mais sentido separado — todo esse código foi
removido de `Renda`/`RendaRequest`/`RendaResponse`/`RendaService`/
`RendaController` e reconstruído como entidade própria.)*

#### CDI real via Banco Central (mantido desde a 1ª tentativa)
- **API pública do BCB** (SGS, série 12 = "Taxa de juros - CDI", % ao dia),
  sem chave de acesso: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados`.
- `BcbCdiClient` — chama a API via `RestClient`. **Gotcha**: quando não há
  valor publicado no período pedido (ex.: consultar "hoje" antes da publicação
  diária do BCB, que sai só no fim do dia), o BCB devolve **HTTP 404** com um
  corpo de erro em vez de array vazio — sem tratar isso, a exceção não
  capturada acabava se manifestando pro front como uma **falsa "sessão
  expirada"** (401), porque esse projeto devolve 401 pra qualquer rota
  `/api/**` sem handler correspondente (achado depurando com o usuário — ver
  "Incidentes de depuração" abaixo). Corrigido: `catch (RestClientException)`
  → devolve lista vazia + `log.warn`.
- `CdiDiario` (tabela `cdi_diario`, cache local) + `CdiService`: `garantirCache`
  só busca no BCB o trecho que falta (cabeça/cauda do intervalo já cacheado).
  Como o BCB só publica dias úteis, **as datas da tabela já são o calendário
  de dias úteis** — não precisa de lista de feriados.
- **Otimização de performance** (pedida pelo usuário, resposta "meio lenta"):
  `CdiService` guarda em memória (`Map<LocalDate, Instant>`, cooldown de 20 min)
  quando uma busca não trouxe dado novo — evita bater no BCB de novo a cada
  requisição enquanto "hoje" ainda não foi publicado (era a causa da lentidão:
  toda consulta de posição tentava buscar "hoje" e falhava de novo).
- `CdiController` — `GET /api/cdi/atual`: taxa diária mais recente + anualizada
  aproximada (`(1+diária)^252 - 1`), usado pra mostrar "CDI atual" ao cadastrar.

#### Modelo de dados: `InvestimentoCdb` é um CONTAINER de `AporteCdb` (lotes)
Passou por uma correção de bug importante: a versão inicial guardava
`valorAplicado`/`dataAplicacao` direto no `InvestimentoCdb`, e "investir mais"
somava o valor atual (já rendido) como se fosse principal novo e **reiniciava**
a `dataAplicacao` — isso **apagava o rendimento acumulado** (o usuário reportou:
"zera como se não tivesse rendido nada" e "nada é descontado no resgate").
Correção: cada aporte (o inicial + cada "investir mais") virou um **lote**
próprio (`AporteCdb`: valor + data), com seu **próprio relógio** de
rendimento/dias (IOF/IR). `InvestimentoCdb` guarda só `descricao`,
`percentualCdi` (comum a todos os lotes) e `dataResgate`. O front só vê a
**soma** dos lotes (`InvestimentoCdbResponse.valorAplicado` = soma;
`dataAplicacao` = data do lote mais antigo).
- `AporteCdbRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc` — ordem
  **FIFO**, usada pra consumir lotes num resgate parcial (o mais antigo primeiro).
- `investirMais()` só cria um `AporteCdb` novo — **não toca** nos lotes existentes.
- **Ordenação por inserção**: `InvestimentoCdbRepository.findByUsuarioIdOrderByIdAsc`
  (o usuário reclamou que a lista parecia ordenada por valor; sem `ORDER BY`
  explícito o banco não garante nenhuma ordem).

#### Resgate: usuário recebe EXATAMENTE o que pede ("gross-up")
Decisão do usuário, confirmando como funciona de verdade: você pede pra
resgatar R$X e **recebe R$X** — quem "paga" o IOF/IR é o saldo que **fica**
investido, não o valor entregue. Isso é o oposto de "informar o valor bruto a
sacar e receber menos".
- `ImpostosCdb` (util puro): tabela de **IOF regressivo** (96% no dia 1 → 0%
  a partir do dia 30, `Decreto 6.306/2007`) e **IR regressivo** (22,5% / 20% /
  17,5% / 15%, `Lei 11.033/2004`).
- Fórmula de valorização: `valorAtual = valorAplicado * fatorCdiAcumulado^(%CDI/100)`.
- **Gross-up**: dado o líquido desejado, resolve `valorBruto = valorLíquido /
  (1 − taxaEfetiva)`, onde `taxaEfetiva` combina IOF+IR sobre a fração de
  rendimento embutida no saque. Implementado com FIFO entre lotes: consome o
  lote mais antigo por inteiro se o líquido pedido "cabe" nele; senão faz o
  gross-up só dentro do **último** lote tocado (parcial), preservando os
  seguintes intactos.
- `InvestimentoCdbService.processarResgate(...)` roda **duas vezes** por
  resgate real: 1ª com `persistir=false` (valida e calcula, pode lançar
  `OperacaoInvalidaException` se não há saldo suficiente, sem mutar nada), 2ª
  com `persistir=true` (efetiva). Evita deixar lotes parcialmente mutados se o
  resgate falhar no meio.
- Endpoints: `POST /{id}/simular-resgate` e `/resgatar` (corpo `{valor}` =
  líquido desejado) + `/simular-resgate-total` e `/resgatar-total` (sem corpo,
  drena tudo — usado pelo botão "Resgatar tudo").
- Resgate cria um lançamento de `Renda` (`tipo RETORNO_INVESTIMENTOS`,
  `mesReferencia` = mês do resgate, `valor` = líquido) — é assim que o
  investimento "vira renda" só quando resgatado.

#### Frontend
- `pages/HomePage.tsx` — nova seção "Investimento CDB" (entre as StatCards e
  "Últimas despesas"): lista os ativos (`dataResgate == null`), busca a posição
  de cada um em paralelo (`Promise.all`), botões **Investir mais**, **Resgatar**,
  Editar, Excluir por linha.
- `components/NovoInvestimentoCdbModal.tsx` — criação (descrição, valor, %CDI,
  data, mostra CDI atual) e edição (só descrição + %CDI editáveis — valor/data
  viram soma de lotes, então ficam **escondidos** no modo edição; continuam
  sendo enviados por baixo, pré-preenchidos, porque o `InvestimentoCdbRequest`
  ainda exige esses campos `@NotNull` — o backend simplesmente os ignora no PUT).
- `components/InvestirMaisModal.tsx` — só um campo de valor.
- `components/ResgatarCdbModal.tsx` — o mais retrabalhado da sessão:
  - Sem botão "Calcular" separado. **"Resgatar"** e **"Resgatar tudo"** cada um
    funciona em **2 cliques**: 1º simula e o próprio botão vira "Confirmar
    resgate"; 2º efetiva. Mudar o valor descarta uma simulação parcial pendente.
  - Card de impostos enxuto (só o que o usuário pediu): **IOF sobre o
    rendimento** (some da lista se não houver), **IR sobre o rendimento**,
    **valor descontado com os impostos** (= líquido + impostos, ou seja, o
    **bruto retirado da posição** — não a soma dos impostos sozinha, ajustado
    depois de o usuário apontar a confusão) e **valor que você recebe**.
- `api/investimentosCdb.ts`, `api/cdi.ts` — novos módulos.
- `types/financas.ts` — `InvestimentoCdb`, `InvestimentoCdbRequest`,
  `PosicaoCdb`, `SimulacaoResgate` (`valorBrutoRetirado`, não `valorSolicitado`
  — renomeado quando o significado mudou pro gross-up), `CdiAtual`.

### Incidentes de depuração (vale saber pra próxima vez)
1. **"Sessão expirada" falsa ao marcar CDB**: o backend rodando (`spring-boot:run`)
   estava desatualizado (de antes do código do CDI existir). Rota desconhecida
   em `/api/**` → 401 (não 404) nesse projeto, e o interceptor de sessão (Parte 4)
   tratou isso como sessão vencida. Lição: **reiniciar o backend** sempre que
   endpoints novos forem adicionados — `mvnw spring-boot:run` não faz hot-reload.
2. **BCB devolvendo 404 "Value(s) not found"**: coberto acima, na seção de CDI.
3. **Maven com cache incremental enganoso**: `mvn test-compile` às vezes reportou
   "Nothing to compile - all classes are up to date" mesmo com fontes de teste
   alteradas. Usar `mvn clean test-compile`/`clean test` quando isso for suspeito.

### Dívida de dados (dev)
Investimentos CDB criados **antes** da migração pro modelo de lotes (`AporteCdb`)
ficaram sem lote associado (a tabela é nova; `ddl-auto=update` não migra dados
de colunas removidas). Aparecem com saldo zerado — é preciso recriá-los. Mesmo
tipo de dívida já existia em `limite_categoria.mes_referencia` (Parte 3).

### Verificação
Suíte completa do backend: **137 testes verdes** (destaque:
`investirMaisNaoDeveApagarORendimentoJaAcumuladoNoLotePrimeiro`, o teste do bug
relatado, e um caso de resgate parcial cruzando 2 lotes via FIFO).
`npm run build` limpo. Verificado ponta a ponta via `curl` a cada reinício do
backend (criar investimento, investir mais, simular/confirmar resgate parcial e
total) e depois confirmado pelo usuário no navegador real.
