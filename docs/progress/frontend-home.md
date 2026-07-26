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

## Parte 6 — Plano de contenção (CONSTRUÍDA e VERIFICADA em 2026-07-25)

Nova seção **FIXA na Home** (sempre visível, mesmo quando não há nada a fazer):
avisa quanto da renda do mês veio de fontes NÃO garantidas no mês seguinte
(freela + retorno de investimentos) e sugere um corte proporcional nas despesas
extraordinárias para não fechar o próximo mês no negativo. Só frontend — nenhuma
mudança de backend.

### Arquivos
- `utils/contencaoRendaVariavel.ts` (novo) — função pura `planoContencao`.
- `utils/datas.ts` — novo helper `primeiroDiaDoProximoMesISO()` (usado só para
  o rótulo do mês no título da seção, via `mesCurtoBR` que já existia).
- `pages/HomePage.tsx` — busca `listarRendas()` (novo fetch no `carregar()`),
  deriva os valores abaixo e renderiza a seção entre as 3 StatCards e
  "Investimento CDB".

### Regra de negócio (evoluiu bastante durante a sessão — o que ficou valendo)
- **Valor a reduzir** = `max(0, totalDespesas - rendaFixaMes)`, onde
  `totalDespesas` já soma despesas FIXA + EXTRAORDINARIA do mês. Importante:
  isso **já contabiliza despesas fixas** automaticamente (a sobra da renda
  fixa sobre as despesas fixas entra no cálculo agregado) — não precisa somar
  despesas fixas à parte. Confirmado com o usuário via exemplo numérico.
  Tentativa anterior (`freela + retorno de investimentos`, sem olhar despesas)
  foi **descartada**: só dispara a sugestão de corte quando a renda FIXA
  sozinha não cobriria as despesas do mês (ou seja, o mês só fechou graças à
  renda variável) — se a renda fixa já cobre tudo, a seção mostra uma
  mensagem verde de "nada a reduzir", nunca desaparece.
- **Seleção de categorias extraordinárias** (múltiplas iterações, regra final):
  começa só na maior categoria; só chama a próxima se o valor a reduzir for
  **>= 30% da soma já selecionada** (mesmo limite em todos os saltos, não só
  no primeiro); limite de **10 categorias** (`MAX_CATEGORIAS`). Se travar em
  10 e ainda não cobrir o valor, o corte por categoria vai naturalmente se
  aproximando de 100% (não pode passar disso) e aparece um aviso âmbar com o
  valor exato que falta. (Versões descartadas no caminho: sempre começar com
  Top 5; limite de 50% a partir da 2ª categoria — o usuário achou que 50%
  "ainda ficava muito grande".)
- **Distribuição**: proporcional LINEAR ao peso do gasto de cada categoria
  selecionada (`reduçãoCategoria = gastoCategoria / somaSelecionada * valorAlvo`).
  Alternativas consideradas e descartadas (documentadas em comentário no
  código): proporcional ao excedente sobre a menor categoria; water-filling.
- **Economia do mês já negativa**: não força 100% de corte (a fórmula acima já
  escala proporcionalmente com a gravidade — confirmado com contraexemplo
  numérico que economia negativa não implica matematicamente 100%). Em vez
  disso, ganhou um aviso vermelho **adicional** (distinto do aviso âmbar de
  "não cobre") quando `economia < 0`, só para deixar a gravidade mais clara na
  mensagem — sem mexer no cálculo.

### UI
- Título dinâmico: "Plano de contenção — {mês seguinte, ex.: ago/26}".
- Sempre 3 estados possíveis: (1) nada a reduzir (mensagem verde); (2) precisa
  reduzir, com lista de categorias e % de corte cada uma (+ aviso vermelho
  extra se a economia do mês já é negativa); (3) mesmo os itens 1/2, mais o
  aviso âmbar se nem reduzindo tudo cobre o valor.
- Textos de aviso ficam todos inline em `HomePage.tsx` (não há arquivo de
  mensagens/i18n separado).

### Verificação
`npm run build`/`npm run lint` limpos a cada iteração. Testado ponta a ponta no
navegador várias vezes, incluindo cenários simulados via `fetch` direto à API
(criar categorias/despesas/rendas de teste, conferir o cálculo, reverter depois)
para cobrir: nenhuma renda variável no mês, corte pequeno (1 categoria), corte
cruzando o limite de 30% (2 categorias), 12 categorias com corte grande
(parou exatamente em 10, cada uma a 100%, aviso de faltante certo), renda fixa
cobrindo tudo (mensagem verde) e economia do mês negativa (aviso vermelho).

## Parte 7 — Seleção múltipla + exclusão de categoria em uso (CONSTRUÍDA e VERIFICADA em 2026-07-25)

Duas frentes pedidas pelo usuário: (1) marcar vários itens e excluir em lote nas
telas de listagem; (2) um bug sério — excluir uma categoria já usada em despesas
ou limites deslogava o usuário em vez de mostrar um erro.

### Seleção múltipla + exclusão em lote
- `hooks/useSelecao.ts` (novo) — Set de ids selecionados. Expõe `alternar(id)`,
  `limpar()`, `selecionarTodos(ids)` (faz **merge** no Set, não substitui — importante
  pra permitir mais de um "selecionar todos" na mesma página sem apagar seleção de
  outra seção), `desselecionarTodos(ids)` (remove só esses ids) e
  `todosSelecionados(ids)`.
- `components/BarraSelecao.tsx` (novo) — barra "N selecionados" + Cancelar/Excluir,
  só aparece quando há seleção.
- `components/SelecionarTodos.tsx` (novo) — checkbox "Selecionar todos" reutilizável.
- Aplicado com checkbox por item + `BarraSelecao` + `SelecionarTodos` em **todas as
  6 listas**: `CategoriasPage`, `RendasPage`, `DespesasPage`, `ObjetivosPage`,
  `LimitesPage` e a seção "Investimento CDB" da `HomePage`.
- Em `RendasPage` (3 seções por tipo: Fixa/Variável/Retorno), o usuário pediu
  **um "Selecionar todos" por seção**, não um único pra página toda — por isso
  `selecionarTodos` faz merge em vez de substituir (cada seção some/some só os
  ids do seu tipo, sem mexer na seleção das outras).
- Exclusão em lote das 5 telas sem regra de "em uso" (Rendas, Despesas, Objetivos,
  Limites, CDB) usa `Promise.allSettled` sobre os ids marcados e reporta quantos
  falharam. Categorias tem fluxo próprio (ver abaixo) porque pode estar em uso.
- **Bug encontrado e corrigido**: excluir um item pelo botão individual da própria
  linha **não tirava o id da seleção** — se ele já estivesse marcado, ficava "só"
  no Set mesmo após sumir da lista, inflando a contagem da `BarraSelecao` e
  quebrando a exclusão em lote seguinte (tentava excluir um id que já não existe
  mais). Corrigido chamando `desselecionarTodos([id])` logo após cada exclusão
  individual bem-sucedida, nas 6 telas.

### Excluir categoria em uso: bug do deslogamento + cascata com aviso
Fluxo problemático original: excluir uma `Categoria` referenciada por `Despesa`/
`LimiteCategoria` (FK sem cascade) causava `DataIntegrityViolationException`
**não tratada**, que o Spring Boot encaminhava pro `/error` interno; como
`SecurityConfig` tinha `.anyRequest().authenticated()` sem liberar `/error`, o
`HttpStatusEntryPoint(401)` interceptava esse forward e devolvia **401** em vez do
status real — e o interceptor do axios (`api/client.ts`) trata qualquer 401 fora
de `/auth/*` como sessão expirada, deslogando o usuário sem motivo real.

**Decisão do usuário**: em vez de só bloquear a exclusão, permitir **excluir em
cascata** (categoria + despesas + limites vinculados), com aviso reforçado
avisando que isso afeta relatórios, e a opção de editar a categoria em vez de
excluir (edição de categoria **não existia** no frontend até esta sessão — o
backend já tinha `PUT /api/categorias/{id}` pronto, só faltava usar).

Backend (`CategoriaService.java`, `CategoriaController.java`):
- `excluir(usuarioId, categoriaId)` (2 args, mantido p/ compat) delega pra
  `excluir(usuarioId, categoriaId, cascata)` (novo overload). Sem `cascata`,
  continua lançando `CategoriaEmUsoException` (409) se a categoria estiver em uso
  (`despesaRepository.existsByCategoriaId` / `limiteCategoriaRepository.existsByCategoriaId`).
  Com `cascata=true`, chama `deleteByCategoriaId` (novo, nos dois repositórios)
  antes de excluir a categoria.
- `DELETE /api/categorias/{id}?cascata=true` (query param, default `false`).
- `SecurityConfig.java` — `.requestMatchers("/error").permitAll()` adicionado
  como defesa em profundidade (evita que qualquer exceção não tratada futura
  vire 401 disfarçado).
- **Bug real encontrado só em teste manual (não pego pelos testes unitários com
  mock)**: o método `excluir(..., cascata=true)` dava **500**, não 409 nem 204.
  Causa: `deleteByCategoriaId` é um "query method" derivado do Spring Data, que
  roda em transação **somente leitura** por padrão quando não há transação
  explícita ao redor — e uma query de DELETE dentro de uma transação read-only
  falha. Fix: `@Transactional` em `CategoriaService.excluir(usuarioId, categoriaId,
  cascata)`. Validado subindo uma instância temporária do backend numa porta
  separada (8099, sem mexer na instância normal do usuário na 8080) e reproduzindo
  o cenário real via `curl` (categoria com despesa E limite vinculados → 409 sem
  cascata, 204 com cascata e sumiu de fato).
- Testes novos em `CategoriaServiceTest` (cascata chama os dois `deleteByCategoriaId`
  antes de `categoriaRepository.delete`; sem uso não chama nenhum) e
  `CategoriaControllerTest` (`cascata=true` → 204, sem cascata em uso → 409).
  Suíte total: **143 testes verdes**.

Frontend:
- `NovaCategoriaModal.tsx` ganhou modo edição (prop opcional `categoria`, mesmo
  padrão do `NovaRendaModal`): prefill do nome + `atualizarCategoria` (novo em
  `api/categorias.ts`) em vez de `criarCategoria`.
- `api/categorias.ts` — `excluirCategoria(id, cascata = false)` manda
  `?cascata=true` quando `cascata`.
- **Sem `confirm()`/`alert()` nativo do navegador** para excluir categoria (pedido
  explícito do usuário) — dois popups novos, com um estágio que só escala se o
  backend recusar com 409 (ou seja, só pede o aviso forte quando a categoria
  realmente está em uso):
  - `components/ExcluirCategoriaModal.tsx` (exclusão individual): abre como
    confirmação simples "Excluir a categoria X?"; só se a tentativa sem cascata
    voltar 409 é que muda pra um segundo estágio com aviso âmbar (despesas E
    limites serão apagados, afeta relatórios), campo pra digitar **EXCLUIR** (o
    botão destrutivo só habilita com a palavra exata) e botão "Editar categoria".
  - `components/ExcluirCategoriasSelecionadasModal.tsx` (exclusão em lote): mesma
    ideia, mas sobre uma lista de ids — tenta excluir todos sem cascata; os que
    falharem (em uso) entram num segundo estágio único (não um popup por item)
    pedindo EXCLUIR pra cascatear só esses; os que não estavam em uso já foram
    excluídos no primeiro passo.
- `CategoriasPage.tsx` — botão "Editar" novo por linha; "Excluir" (individual e em
  lote) abre os popups acima em vez de `excluirCategoria` direto na página.

### Verificação
Backend: `mvnw test` → **143 testes verdes**. Frontend: `npm run build`/`npm run
lint` limpos a cada mudança. Bug do 500 em cascata reproduzido e corrigido via
teste manual com `curl` contra uma instância descartável do backend (documentado
acima). **Falta o usuário testar ponta a ponta no navegador** com o backend
reiniciado (o fix do `@Transactional` só vale depois de reiniciar — `mvnw
spring-boot:run` não faz hot-reload, gotcha já conhecido do projeto).

Commitado e enviado (`f4be4a5`, branch `frontend`) em 2026-07-26.

## Parte 8 — Criar categoria/limite inline em Nova despesa e Simular despesa (2026-07-26)

Pedido do usuário: nos modais "Adicionar despesa" e "Simular despesa" da Home,
poder criar a categoria (e, no simulador, também o limite) sem precisar fechar
o modal e ir até a tela de Categorias/Limites. Só frontend — reaproveita o
mesmo padrão "+ Nova categoria..." que o `NovoLimiteModal` já usava.

- `NovaDespesaModal.tsx`: removida a tela de bloqueio "crie uma categoria
  antes" quando `categorias` vem vazio. O `<select>` de categoria ganhou a
  opção `+ Nova categoria...` (constante `OPCAO_NOVA_CATEGORIA`, igual ao
  `NovoLimiteModal`); sem nenhuma categoria, já abre direto nessa opção. Ao
  submeter, se estiver criando, chama `criarCategoria()` primeiro e usa o id
  retornado na despesa. O `useEffect` que busca o status do limite ignora
  enquanto está no modo "nova categoria" (ainda não há id numérico).
- `SimularDespesaModal.tsx`: mesma opção `+ Nova categoria...` no select (sem
  categoria, abre direto nela). Além disso, quando o resultado da simulação diz
  que a categoria **não tem limite** (`temLimite === false`), em vez de só
  avisar, mostra um campo de valor + botão "Criar limite" inline — cria via
  `criarLimite()` e re-simula automaticamente com o novo teto. Novo prop
  opcional `onCategoriaCriada` (a Home passa `carregar`, a mesma função que já
  recarrega categorias/despesas/renda) para a lista de categorias da Home ficar
  atualizada depois de criar uma categoria por aqui.
- `HomePage.tsx`: só a linha `onCategoriaCriada={carregar}` no
  `<SimularDespesaModal>`.

### Ajuste (mesmo dia): limite já aparece junto ao criar a categoria
Feedback do usuário: no simulador, ao escolher "+ Nova categoria...", o campo
de limite só aparecia depois de clicar "Simular" (repetindo o fluxo de duas
etapas que já existia para categoria já existente sem limite). Corrigido —
quando `criandoNovaCategoria`, o campo "Limite da categoria (R$) — opcional"
já aparece ao lado do nome, antes de simular. Um único clique em "Simular" cria
a categoria e (se preenchido) o limite, e já mostra o resultado.
- `aoSimular`: depois de criar a categoria, se `novoLimiteValor` estiver
  preenchido, cria o limite também (reaproveita `criarLimite`) antes de buscar
  o status.
- `<select>` de categoria: o `onChange` agora limpa `resultado`/
  `novoLimiteValor` ao trocar de categoria manualmente — evita que um valor de
  limite digitado para uma categoria "escape" para outra se o usuário mudar de
  ideia no meio do preenchimento.

### Verificação
`npm run build` e `npm run lint` limpos (só o aviso pré-existente do
`AuthContext`). **Falta testar ponta a ponta no navegador** (fluxo: abrir
"Adicionar despesa"/"Simular despesa" sem nenhuma categoria cadastrada → criar
categoria inline → no simulador, criar categoria nova já com limite preenchido
num único clique → resultado da simulação aparece direto; também testar
categoria já existente sem limite → criar limite inline → resultado atualiza).

## Parte 9 — Vincular Objetivo a Investimento CDB (CONSTRUÍDA 2026-07-26)

Pedido do usuário: poder atrelar um Objetivo a um Investimento CDB. Decisões
confirmadas com o usuário antes de implementar (via pergunta direta):
- O progresso do objetivo passa a ser a **posição atual (ao vivo)** do CDB
  (aplicado + rendimento), não só o que for resgatado.
- **1:1** — um objetivo vincula no máximo 1 CDB; um CDB só pode estar
  vinculado a 1 objetivo por vez.
- Enquanto vinculado, **aportes manuais ficam bloqueados** (o progresso vem
  só da posição do investimento).

### Backend
- `Objetivo` ganhou `@OneToOne @JoinColumn(name="investimento_cdb_id",
  unique=true) InvestimentoCdb investimentoCdb` (nullable). `ddl-auto=update`
  cria a coluna+constraint sozinho (dev).
- `ObjetivoRepository.findByInvestimentoCdbId` — usado tanto para checar
  unicidade quanto para desvincular automaticamente quando o investimento é
  excluído.
- Novo `InvestimentoJaVinculadoException` (409) — tentar vincular um CDB que
  já está preso a outro objetivo.
- `InvestimentoCdbService` ganhou:
  - `buscarParaVinculo(usuarioId, investimentoId)` — valida posse e que o
    investimento não foi resgatado ainda (`OperacaoInvalidaException` se já
    encerrado — a posição ficaria travada em zero pra sempre).
  - `valorAtual(usuarioId, investimentoId)` — soma dos lotes ativos calculada
    ao vivo, sem o guard de "não resgatado" (assim um objetivo vinculado a um
    CDB totalmente resgatado mostra progresso 0, não quebra).
  - `excluir()` agora desvincula qualquer `Objetivo` apontando pro
    investimento **antes** de apagar os lotes e o investimento — sem isso, o
    objetivo ficaria com uma FK órfã.
  - `toResponse()` passou a fazer um lookup reverso (`objetivoRepository.
    findByInvestimentoCdbId`) pra preencher `objetivoId`/`objetivoDescricao`
    na resposta do investimento (pra Home/ObjetivosPage saberem quais CDBs já
    estão "presos").
- `ObjetivoService` ganhou `vincularInvestimento`/`desvincularInvestimento`,
  e `aportar`/`editarAporte`/`removerAporte` agora recusam
  (`OperacaoInvalidaException`) se o objetivo estiver vinculado.
- **Truque para não quebrar `ObjetivoControllerTest`**: em vez de mover o
  mapeamento pra `ObjetivoResponse` pro `ObjetivoService` (o que exigiria
  stubar `objetivoService.toResponse(...)` em cada teste do controller, já
  que o service é mockado lá), o `valorAtual` computado da posição do CDB é
  aplicado **em memória, sem persistir** (`comValorAtualEfetivo`, chamado só
  em `listarPorUsuario`/`atualizar`/`vincularInvestimento`) diretamente no
  objeto `Objetivo` retornado — o `toResponse` estático do controller
  continua igual, só ganhou os 2 campos novos lendo `objetivo.
  getInvestimentoCdb()`. Resultado: os 143 testes existentes passaram **sem
  nenhuma alteração**, só a suíte de serviço precisou de mocks novos
  (`InvestimentoCdbService` no `ObjetivoService`, `ObjetivoRepository` no
  `InvestimentoCdbService`).
- DTOs: `ObjetivoResponse`/`InvestimentoCdbResponse` ganharam os campos de
  vínculo no final (não reordenei os existentes, pra minimizar risco). Novo
  `VincularInvestimentoRequest({investimentoCdbId})`.
- Endpoints novos: `PUT /api/objetivos/{id}/investimento-cdb` (vincula),
  `DELETE /api/objetivos/{id}/investimento-cdb` (desvincula).
- Testes novos: 8 no total (`ObjetivoServiceTest` — vincular, vincular já
  vinculado a outro → 409, desvincular, aportar bloqueado quando vinculado,
  listar usa posição do CDB; `InvestimentoCdbServiceTest` — excluir desvincula
  o objetivo, vincular investimento já resgatado falha, `valorAtual` calcula
  certo). **151 testes verdes no total** (143 + 8 novos).

### Frontend
- `types/financas.ts`: `Objetivo` ganhou `investimentoCdbId`/
  `investimentoCdbDescricao`; `InvestimentoCdb` ganhou `objetivoId`/
  `objetivoDescricao`.
- `api/objetivos.ts`: `vincularInvestimento(id, investimentoCdbId)`,
  `desvincularInvestimento(id)`.
- `components/VincularInvestimentoModal.tsx` (novo): se o objetivo já estiver
  vinculado, mostra a qual investimento + botão "Desvincular"; senão, um
  select só com investimentos **ativos** e **não vinculados a outro
  objetivo** (filtra por `dataResgate === null` e `objetivoId == null ||
  objetivoId === objetivo.id`) + botão "Vincular".
- `pages/ObjetivosPage.tsx`: busca `listarInvestimentosCdb()` também no
  `carregar()`; cada card ganhou um badge "🔗 Vinculado a X" (quando
  vinculado) e um botão "Vincular investimento"/"Gerenciar vínculo com
  investimento" que abre o modal; o botão **"Aportar" some** quando
  `investimentoCdbId != null` (o backend já bloqueia, mas a UI não oferece a
  ação). O termômetro/progresso e o bloco "Como chegar à meta" não mudaram —
  já usam `obj.valorAtual`, que agora vem calculado ao vivo pelo backend
  quando vinculado.
- `pages/HomePage.tsx`: cada linha da seção "Investimento CDB" ganhou um badge
  "🔗 Vinculado ao objetivo X" quando `inv.objetivoId != null` (só leitura,
  sem ação nova aqui — gerenciar o vínculo é sempre pela ObjetivosPage).

### Verificação
Backend: `mvnw test` → **151 testes verdes**. Frontend: `npm run build`/`npm
run lint` limpos. **Falta testar ponta a ponta no navegador** (fluxo: criar
CDB → ir em Objetivos → "Vincular investimento" → progresso do termômetro
passa a refletir a posição do CDB → tentar aportar manualmente deve estar
escondido → "Gerenciar vínculo" → "Desvincular" → aportar volta a aparecer;
também testar excluir o CDB vinculado e confirmar que o objetivo volta a ficar
livre, sem erro).
