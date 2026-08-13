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

## Parte 10 — Configurações (perfil), correção de bug crítico de navegação e Leitor de fatura Nubank

Sessão longa com três frentes: (1) página de Configurações pra editar dados
pessoais/senha/foto; (2) um bug sério de navegação (tela travava trocando de
aba rápido) que só apareceu depois de testar ao vivo com o Claude in Chrome;
(3) o leitor de fatura do Nubank (item que estava no backlog como "PDF",
saiu como CSV — bem mais simples).

### Configurações (perfil do usuário)
Aba nova na sidebar, **fora do bloco de navegação principal** (no rodapé,
acima de "Sair"). Backend: `UsuarioController`/`UsuarioService` (ver
`service-layer.md`/`controller-layer.md`). Frontend:
- `context/PerfilContext.tsx` (novo) — busca o perfil uma vez ao montar
  `Layout` (não remonta a cada navegação), expõe `{ perfil, carregando,
  recarregar }`. Diferente do `AuthContext` (só guarda o token, sem fetch).
- `components/Avatar.tsx` (novo, compartilhado) — mostra a foto (data URI) ou
  as iniciais do nome; prop `tamanho` (`sm`/`lg`) e prop `menu` (usada nos
  cabeçalhos da Home/Movimentações): clicar abre um popup com "Editar perfil"
  que navega pra `/configuracoes` (fecha sozinho ao clicar fora ou Esc —
  **não** é mais um link direto, virou um menu por pedido do usuário).
- `pages/ConfiguracoesPage.tsx` (novo) — cartão de identidade no topo (avatar
  grande com botão de câmera sobreposto, clique abre o seletor de arquivo
  direto) + 2 cards lado a lado ("Dados pessoais", "Alterar senha"). Trocar
  senha ou e-mail exige digitar a senha atual. Validação de nova senha igual
  à atual, tanto no cliente quanto no backend (`OperacaoInvalidaException`).
- **Bug corrigido no caminho**: o interceptor do axios (`api/client.ts`)
  tratava QUALQUER 401 fora de `/auth/*` como sessão expirada e deslogava —
  como "senha atual inválida" também é 401, digitar a senha errada em
  Configurações deslogava o usuário à força em vez de mostrar o erro no
  formulário. Corrigido excluindo `/perfil` do logout automático (mesmo
  tratamento que `/auth/*` já tinha).
- **Bug corrigido no caminho (Hibernate)**: `Usuario.foto` foi criada como
  `@Lob private byte[]` — combinação clássica que faz o Hibernate tentar usar
  a API de LOB do JDBC (em vez de `setBytes` simples), e o driver do Postgres
  rejeita esse binding em **qualquer** save de `Usuario` (não só ao mandar
  foto — nome/e-mail/senha quebravam junto). Corrigido removendo `@Lob`
  (Hibernate 6 já mapeia `byte[]` pra `bytea` sozinho).

### Bug crítico: tela travava trocando de aba rápido
Reportado como "clico rápido entre as abas e a tela trava, mas a URL muda".
Reproduzido **ao vivo com o Claude in Chrome** (o usuário autorizou o uso
pontual, fora do padrão normal de não testar UI). Console mostrou milhares de
`Maximum update depth exceeded` — um loop infinito de render, não um
problema de portal/transição como a hipótese inicial (baseada só em leitura
de código) sugeria.

**Causa raiz**: `NovaCategoriaModal.tsx` (`outrasCategorias =
categorias.filter(...)`) e `PlanejamentoLimites.tsx` (`categoriasSemLimite =
categorias.filter(...)`) recriavam um array novo a cada render, passado pro
hook `useCategoriasSemelhantes` — cujo `useEffect` depende desse array por
referência. Como esses modais ficam **sempre montados** (só escondidos com
`aberto={false}`), e são renderizados toda vez que `PlanejamentoCategorias`/
`PlanejamentoLimites` montam (ida à página de Planejamento), o ciclo
render→novo array→efeito dispara→`setState`→render de novo virava um loop
infinito, travando o React bem na hora de trocar de página.

**Correção**: `useMemo` nos dois arrays, com as dependências certas. Sem
mudar o hook nem o `Modal.tsx` — só a instabilidade dos dois call sites.
Validado ao vivo repetindo o mesmo teste (clicar rápido entre todas as
abas várias vezes) — zero erros no console depois do fix.

### Leitor de fatura Nubank (CSV)
Pedido do usuário: importar despesas em massa a partir da fatura do cartão.
Descoberta importante no meio do processo: **o Nubank exporta a fatura em
CSV**, então nada de PDFBox/OCR — só um parser de CSV (Apache Commons CSV).
Ver `service-layer.md`/`controller-layer.md` pro desenho do backend
(`LeituraFaturaService`, `ParserFaturaNubank`, `DetectorDuplicidadeFatura`,
`DespesaService.criarEmLote`).

- Botão **"Leitor de fatura"** na Home, entre o seletor de mês e "+ Adicionar
  renda". Precisou de um ajuste de layout: a área de ações do cabeçalho
  estava presa em 1/3 da largura do grid (`lg:col-span-1`, alinhamento fino
  pensado só pra 3 itens); com o 4º botão não cabia mais. Virou
  `lg:col-span-2` (título "Início" cede espaço, é curto) + `justify-end` (em
  vez de `justify-between`, que deixava um vão grande no meio) pra
  botões+avatar ficarem colados na borda direita.
- `components/LeitorFaturaModal.tsx` (novo, `Modal` `max-w-4xl`) — 3 passos:
  1. **Upload**: input de arquivo escondido, valida `.csv`/2MB no cliente.
  2. **Revisão**: tabela com checkbox por linha (suspeitas de duplicata
     começam desmarcadas, badge colorido por nível — reaproveita o padrão de
     "degraus de cor por severidade" de `utils/cores.ts`). Itens ignorados
     (estorno/reembolso/pagamento, valor ≤ 0 no CSV) aparecem numa seção
     recolhível separada, só leitura — não desaparecem silenciosamente.
     **Interruptor único "Juntar despesas equivalentes"** no topo da lista
     (não um botão por linha — mudança de design a pedido do usuário): liga
     junta TODOS os grupos de mesma descrição de uma vez (soma dos valores,
     data mais recente), desliga volta tudo pra linhas individuais.
  3. **Categorização em lote**: escolhe uma categoria no topo (com opção de
     criar nova inline, reaproveitando `SeletorCategoria`/`OPCAO_NOVA_CATEGORIA`
     do `NovaDespesaModal.tsx`), marca quais itens levam ela, "Aplicar" — os
     itens aplicados somem da lista de trabalho (não aparecem de novo), até
     zerar. Salva tudo de uma vez em `POST /despesas/lote`.
- `types/leituraFatura.ts`, `api/leituraFatura.ts` (novo módulo),
  `api/despesas.ts` ganhou `criarDespesasEmLote`. `utils/cores.ts` ganhou
  `corNivelDuplicata`.

### Verificação
Backend: `mvnw test` → **228 testes verdes** (novos: `ParserFaturaNubankTest`
com casos sintéticos calibrados contra um CSV real de exemplo fornecido pelo
usuário — sem persistir dados financeiros reais no repositório —,
`DetectorDuplicidadeFaturaTest`, `LeituraFaturaServiceTest`,
`LeituraFaturaControllerTest`, mais testes de `criarEmLote` em
`DespesaServiceTest`). Frontend: `npm run build`/`npm run lint` limpos.
**Falta testar o fluxo completo do leitor de fatura no navegador** com uma
fatura real (upload → revisão → junção → categorização em lote → salvar →
conferir na Home/Movimentações).

## Parte 11 — Ajustes de layout do cabeçalho, leitor de fatura em Despesas, e correções no leitor de fatura (2026-08-07)

Sessão de ajustes finos a partir de feedback direto testando a Parte 10.
Backend: `mvnw test` → **230 testes verdes**. Frontend: `npm run build`/`npm
run lint` limpos a cada mudança, verificado no navegador via Claude in
Chrome a cada passo (inclusive criando contas de teste descartáveis via
`curl` pra reproduzir cenários de duplicata sem sujar a conta real do
usuário).

### Cabeçalho da Home — iteração até o layout final
Passou por 3 tentativas guiadas pelo usuário vendo cada resultado (ver seção
4.1 de `home-layout-atual.md` pro estado final):
1. Avatar subiu pra linha do título, botões numa 2ª linha própria —
   **revertido** ("desceu a foto, não subiu os botões").
2. Botões numa linha, avatar de volta pro título — ainda **errado** (usuário
   queria os botões colados ao avatar, não em linhas separadas).
3. **Final**: título sozinho na 1ª linha; 2ª linha com seletor de mês +
   Leitor de fatura + Adicionar renda + Adicionar despesa + avatar, todos no
   mesmo grupo flex (`gap-3`), avatar sempre por último — layout antigo em
   `lg:grid-cols-3` (que espremia os controles em 1/3 da largura) foi
   abandonado por um `flex` de largura livre.

### Leitor de fatura — bugs e melhorias
- **Bug: categorias existentes não apareciam no seletor da categorização**,
  só as criadas durante a própria sessão do leitor. Causa: `categoriasLocais`
  (estado interno do modal) era inicializada de `categorias` só na 1ª
  montagem do componente — que acontece junto com a página hospedeira, antes
  da lista real terminar de carregar da API — e nunca mais sincronizava.
  Fix: `useEffect` resincroniza `categoriasLocais` toda vez que o modal abre
  (`aberto` vira `true`), não só ao fechar.
- **Bug: reimportar a mesma fatura não sinalizava duplicata pra despesas já
  importadas em bloco** (via "Juntar despesas equivalentes"). Dois problemas
  em cascata no backend, ver `service-layer.md` item 11
  (`DetectorDuplicidadeFatura`): (1) a comparação ignora agora o sufixo
  `"(Nx)"` no nome; (2) candidatas em bloco dispensam a checagem de valor
  exato (o valor salvo é a soma de vários itens). Diagnosticado testando
  contra o backend real via `curl` com contas descartáveis — no caminho,
  também descobri que o backend local do usuário (`mvnw spring-boot:run`)
  estava rodando código desatualizado (não faz hot-reload) **e** bateu no
  bug de cache incremental do Maven já documentado (`service-layer.md`,
  "Ambiente local") — precisei matar o processo, `mvnw clean compile`, e
  subir de novo pro fix realmente entrar em vigor.
- **Juntar despesas de meses diferentes**: decisão de produto discutida com
  o usuário. Primeiro implementei "não junta entre meses" (grupo por
  descrição+mês); o usuário esclareceu que quis a opção mais elaborada: a
  tela de revisão junta visualmente **mesmo cruzando meses** (facilita
  selecionar/categorizar tudo de uma vez), mas a tela de categorização
  **expande de volta em uma linha por mês** — cada mês vira sua própria
  despesa ao salvar, sem cair tudo somado num mês só. Implementado com
  `expandirParaMeses()`: a linha juntada da revisão guarda os itens
  originais (`mesclado.itensOriginais`); ao avançar pra categorização, cada
  grupo é reagrupado por `data.slice(0,7)` e vira uma `LinhaExibida` própria
  (com seu próprio `(Nx)` se aquele mês específico tinha 2+ itens). Testado
  ponta a ponta: 3 lançamentos "Uber" (1 julho + 2 agosto) → juntam em
  "Uber (3x)" na revisão → aparecem como 2 linhas na categorização → salvam
  como 2 despesas reais, uma por mês (confirmado via `GET /despesas`).
- **Botão "Juntar despesas equivalentes"** ganhou mais destaque (pedido
  direto do usuário): trocado de checkbox+label discreto para um botão
  Khand caixa alta — contorno azul quando desligado, preenchido `grouper-mid`
  sólido com "✓" quando ligado.
- **Tela de categorização**: reorganizada em 2 colunas a partir de `lg`
  (pedido do usuário) — lista de despesas à **esquerda** (`flex-1`), painel
  de categoria (seletor + campos de nova categoria + botão "Aplicar") à
  **direita** (`lg:w-64`, largura fixa). Empilha no mobile.
- **Botão "Voltar"** em todas as etapas (upload não tem, é a primeira):
  Revisão → volta pro Upload; Categorização → volta pra Revisão.
- **Confirmação ao fechar em andamento**: popup de aviso **próprio** (não o
  `confirm()` nativo do navegador, pedido explícito do usuário) sobreposto
  ao modal — pergunta antes de descartar uma leitura já em progresso. Cobre
  fechar pelo X, Esc ou clique fora (todos passam pelo mesmo `onClose` do
  `Modal` genérico); só pergunta se já há algo em andamento (etapa além do
  upload, ou arquivo já processado) — fechar a tela de upload vazia fecha
  direto.

### Leitor de fatura também na aba Despesas de Movimentações
Botão idêntico ao da Home (mesmo `LeitorFaturaModal.tsx`, reaproveitado sem
duplicar código) adicionado em `DespesasPage.tsx`, entre o seletor de mês e
"+ Adicionar despesa" — ver `movimentacoes-layout-atual.md` seção 4.

### Data/mês pré-selecionados nos modais de novo lançamento
Pedido do usuário: abrir "Nova despesa"/"Nova renda" a partir de uma tela com
seletor de mês deve preencher a data/mês do formulário com o **mês em foco**
daquela tela, não sempre hoje/mês atual (`DespesasPage` já fazia isso; faltava
`HomePage` e `RendasPage`).
- `NovaRendaModal` ganhou a prop opcional `mesPadrao` ("YYYY-MM"), usada como
  valor inicial do campo "Mês" (sem ela, cai no mês atual, comportamento
  antigo preservado).
- `HomePage.tsx` passa `dataPadrao` (helper já existia, só faltava plugar) pro
  `NovaDespesaModal` e `mesPadrao={mes}` pro `NovaRendaModal`.
- `RendasPage.tsx` passa `mesPadrao={mes}` pro `NovaRendaModal`.

### Verificação
Backend: `mvnw test` → 230 testes verdes (2 novos em
`DetectorDuplicidadeFaturaTest` cobrindo o caso de bloco). Frontend:
`npm run build`/`npm run lint` limpos. Testado no navegador via Claude in
Chrome a cada mudança: layout do cabeçalho da Home, sincronização de
categorias no leitor, junção cruzando meses expandindo por mês na
categorização (confirmado via API que salva 2 despesas separadas), botão de
leitor de fatura na aba Despesas de Movimentações, pré-seleção de mês/data
nos 3 pontos (Home despesa/renda, Rendas).

## Parte 12 — Ajustes finos de UI no `LeitorFaturaModal` (2026-08-08)

Sessão só de frontend, iterando com o usuário vendo cada resultado (sem
Claude in Chrome desta vez — mudanças só de estilo/copy, usuário testa ele
mesmo). Nenhuma mudança de backend. Arquivos tocados:
`components/LeitorFaturaModal.tsx` e `components/Modal.tsx` (2 props novas,
opcionais, só usadas por este caller).

### `Modal.tsx` ganhou 2 props opcionais (sem afetar os outros ~15 callers)
- `classeCard?: string` — classes extras no card (usado aqui pra uma borda
  de destaque, ver abaixo). Default `""`.
- `bordaCabecalho?: boolean` — liga/desliga a linha divisória abaixo do
  título. Default `true` (comportamento antigo, preservado pros outros
  modais). O leitor de fatura usa `false`.

### Popup do leitor: borda + bordas internas mais sutis
- Card do modal ganhou `border-2 border-grouper-ink` (azul bem escuro do
  menu lateral) — via `classeCard`, e a linha sob o título foi removida
  (`bordaCabecalho={false}`).
- Todas as divisórias/caixas internas (`divide-y` das listas, contorno das
  caixinhas recolhíveis) trocaram de `grouper-sky/45`(divisórias) e
  `grouper-sky/20` (bordas de caixa) para `grouper-ink/20` — mesma cor da
  borda externa, só que bem mais sutil (opacidade baixa), pra não competir
  com ela. Inputs de formulário e checkboxes **não** foram tocados (esses
  continuam com o padrão azul normal do app, não são "divisões").

### Etapa Upload
- Texto de introdução reescrito: agora orienta a exportar em **CSV, não
  PDF**, menciona o tutorial e o nome do botão de seleção; parágrafo ficou
  `text-justify` (justificado).
- Novo botão **"Tutorial de exportação"** ao lado de "Selecionar CSV da
  fatura" — link (`<a target="_blank" rel="noopener noreferrer">`) pro
  vídeo do YouTube que ensina a exportar a fatura em CSV pelo app do
  Nubank, contorno azul (`border-grouper-mid`) pra não competir com o botão
  de ação principal (sólido).
- Os dois botões ganharam `justify-center` + `pt-4` (mais respiro acima,
  centralizados no popup).

### Etapa Revisão
- **"Juntar despesas equivalentes" e "Selecionar todos" deixaram de ser
  botões** e viraram checkboxes discretos com texto ao lado (mesmo padrão
  visual dos checkboxes de item da lista) — pedido do usuário pra não tirar
  atenção dos botões de ação no rodapé ("← Voltar" / "Cancelar" /
  "Continuar"). Texto em `font-semibold text-base` (maior e mais forte que
  o padrão `text-sm`, pra compensar o fato de não serem mais botões
  sólidos).
  - "Selecionar todos" tem **nome fixo** — não alterna mais para "Desmarcar
    todos" conforme o estado; o próprio estado marcado/desmarcado do
    checkbox já comunica isso.
  - Ordem final: texto "Selecione as despesas que deseja incluir" primeiro
    (linha antiga "N linha(s) encontrada(s)..." foi substituída por essa
    frase mais direta), depois os dois checkboxes na ordem "Selecionar
    todos" → "Juntar despesas equivalentes" — passou por algumas trocas de
    ordem/posição a pedido do usuário até chegar nessa.
- Texto "N item(ns) ignorado(s) — estorno..." dos itens ignorados
  simplificado pra só a contagem, com plural condicional de verdade (`{n}
  {n === 1 ? "item ignorado" : "itens ignorados"}`) em vez do
  `item(ns)/ignorado(s)` genérico.
- Valor (R$) dos itens da lista **perdeu o negrito** (`font-semibold`
  removido) — mesmo ajuste replicado na lista da Categorização. Descrição
  do item ganhou `font-normal` explícito (já não tinha negrito no código,
  adicionado só por clareza/robustez a pedido do usuário).
- Botão "Cancelar" chegou a ficar vermelho (`text-red-600`) numa iteração,
  mas o usuário pediu pra **voltar à cor antiga** (`text-grouper-navy
  hover:bg-grouper-mist`) — estado final é a cor original, sem vermelho.
  O mesmo vale pro "Fechar" da tela de revisão vazia (nenhuma despesa
  importável no CSV).

### Etapa Categorização
- Botão final de salvar (antes "Salvar N despesa(s)", desabilitado
  enquanto sobrasse item sem categoria) virou **"Continuar"**:
  - Se ainda há itens sem categoria (`itensParaCategorizar.length > 0`):
    texto **"Continuar com N despesa(s)"** (N = já categorizadas) — não
    fica mais desabilitado nesse caso. Clicar abre um popup de aviso
    próprio ("Continuar sem categorizar tudo?", mesmo padrão do popup de
    cancelar leitura) avisando que os itens ainda sem categoria **não
    serão incluídos**; o usuário escolhe "Continuar categorizando" (fecha
    o aviso) ou "Continuar mesmo assim" (salva só os já categorizados).
  - Se **todos** os itens já têm categoria: texto vira só **"Continuar"**,
    sem popup — salva direto.
  - Novo estado `pedindoConfirmacaoSalvarParcial` + funções
    `aoClicarContinuar`/`manterCategorizando`/`confirmarSalvarParcial`,
    resetado em `reiniciar()` como os outros popups do componente.
- Lista de itens já categorizados (antes sempre visível abaixo do painel de
  trabalho) virou uma **caixinha recolhível**, fechada por padrão
  ("N já categorizada(s)" / "ver ▼"), mesmo padrão da caixinha de itens
  ignorados da Revisão — novo estado `mostrarProntos`.
- Botão "Cancelar" passou pela mesma iteração de cor que o da Revisão
  (vermelho → revertido pra `text-grouper-navy`, cor original).

### Verificação
Só frontend, mudanças de estilo/copy — usuário testa visualmente ele mesmo
(preferência já registrada: não uso Claude in Chrome por padrão).
`npm run build` limpo (707 módulos; aviso de chunk >500kB é o de sempre, do
Recharts). **Falta o usuário conferir visualmente** os estados descritos
acima (upload com tutorial, checkboxes da revisão, popup de "continuar sem
categorizar tudo", caixinha recolhível de itens prontos).

## Parte 13 — Despesa de cartão conta no mês da fatura, e fix na detecção de duplicata (2026-08-09)

Pedido do usuário: quando a fatura de julho é paga em agosto, a despesa
precisa contar no orçamento de **agosto**, não de julho — é a renda de
agosto que paga a fatura. Decisão fechada com o usuário, sem lógica de "mês
que mais aparece" nem popup de alerta: o mês que conta é sempre o **mês
selecionado na tela ao abrir o leitor** (mês em que a fatura é
paga/subida), independente da data real de cada compra; a data real
continua salva e exibida normalmente.

### Backend — `Despesa.mesReferencia`
Novo campo `mesReferencia` (LocalDate, nullable, primeiro dia do mês) em
`Despesa`, espelhando o padrão que `Renda.mesReferencia` já usava. Só o
Leitor de fatura preenche esse campo; despesas manuais continuam com
`mesReferencia = null`, caindo no fallback do mês de `data` (comportamento
antigo, inalterado).
- `DespesaSpecification.comPeriodo` passou a filtrar por
  `COALESCE(mesReferencia, data)` — propaga automaticamente pra `listar`,
  `calcularTotalPorPeriodo`, `calcularTotalPorCategoriaEPeriodo` e
  `RelatorioService.compararMeses` (Home), sem tocar nesses métodos. Novo
  `comPeriodoReal` (sem COALESCE) isolado só pra busca de candidatas a
  duplicata do leitor de fatura, que precisa continuar usando a **data
  real** (proximidade de compra), não o mês de orçamento — nova
  `DespesaService.listarPorDataReal`.
- `DespesaService.atualizar` **não** mexe em `mesReferencia` de propósito —
  editar uma despesa de fatura pela tela normal de Despesas não apaga o
  vínculo dela com o mês da fatura.
- `LeituraFaturaService.processar`: **removido o filtro que descartava
  itens fora do mês selecionado** (bug relacionado — uma fatura real cruza
  dois meses de calendário, então uma parte legítima da fatura sumia sem
  querer). Agora todo item positivo (não estorno/reembolso) vira despesa
  importável, com `mesReferencia` = mês selecionado, igual para todos os
  itens.
- Toda despesa importada ganha o prefixo **"(Crédito) "** na frente da
  descrição (aplicado em `LeituraFaturaService`, não no frontend) — fica
  visualmente distinguível de lançamentos manuais.
- DTOs (`DespesaRequest`, `DespesaResponse`, `ItemFaturaExtraidoResponse`)
  e `DespesaController` (mapeamento manual `toEntity`/`toResponse`)
  ganharam o campo novo.

### Bug encontrado depois: prefixo "(Crédito)" quebrava a detecção de duplicata exata
Reportado pelo usuário testando reimportação da mesma fatura: duas despesas
na mesma data, uma foi corretamente sinalizada como duplicata forte e outra
não. Reproduzido com os dados reais do usuário via um teste temporário — o
nível **ALTA** (só valor + data, sem checar descrição) bateu certo pras
duas, então a causa raiz não era essa; mas ao investigar o código foi
encontrado um bug real e diferente: `DetectorDuplicidadeFatura.normalizar()`
não ignorava o prefixo "(Crédito) " ao comparar descrições — como a despesa
já salva tem o prefixo e a linha crua reimportada do CSV nunca tem, a
comparação **exata** de descrição (usada nos níveis **ALTISSIMA** e
**BLOCO**) nunca batia numa reimportação. Corrigido ignorando o prefixo do
mesmo jeito que já ignorava o sufixo "(Nx)" de blocos juntados — novo
`PREFIXO_CREDITO` regex em `normalizar()`. Dois testes novos cobrindo
ALTISSIMA e BLOCO com o prefixo presente na despesa já salva.
Aviso pro usuário: `mvnw spring-boot:run` não recarrega sozinho — é preciso
reiniciar o backend depois de qualquer mudança de código pra ela valer,
gotcha já conhecido do projeto.

### Frontend
- `types/financas.ts` (`Despesa.mesReferencia`, `DespesaRequest.mesReferencia`),
  `types/leituraFatura.ts` (`ItemFaturaExtraido.mesReferencia`).
- Novo helper `utils/despesasResumo.mesEfetivoDespesa(despesa)` — espelha o
  `COALESCE` do backend (`mesReferencia ?? data`), usado no agrupamento do
  gráfico "Despesas dos últimos meses" em `DespesasPage.tsx` (antes agrupava
  direto por `d.data.slice(0, 7)`).
- `LeitorFaturaModal.tsx`: `salvarTudo()` inclui `mesReferencia` (mês
  selecionado) em cada despesa do lote salvo.
- **Cor do badge de duplicata** (`utils/cores.ts`, `corNivelDuplicata`):
  pedido do usuário — os 4 níveis (ALTISSIMA, ALTA, MEDIA e também BLOCO,
  que antes usava azul da marca por ser "informativo") agora usam a mesma
  família de vermelho (`grouper-red` como âncora), variando só a
  tonalidade: mais escuro/saturado (`#8B0000`, ALTISSIMA) → mais claro
  (`#D97A75`, BLOCO), todos com texto branco.

### Verificação
Backend: `mvnw test` → suíte completa verde (novos testes em
`LeituraFaturaServiceTest`, `DespesaServiceTest`, `DespesaControllerTest`,
`LeituraFaturaControllerTest`, `DetectorDuplicidadeFaturaTest`). Frontend:
`npm run build`/`npm run lint` limpos. **Falta o usuário testar no
navegador** com o backend reiniciado: subir uma fatura cruzando dois meses
de calendário e conferir que tudo cai no mês selecionado, e reimportar a
mesma fatura conferindo que a cor de duplicata aparece certa nos dois
casos (ALTISSIMA/ALTA/BLOCO em vermelho, tonalidades diferentes).

## Parte 14 — Troca de fonte pra Inter, tooltip próprio do app, e ajustes finos de UI (2026-08-10)

Sessão só de frontend, iterando com o usuário vendo cada resultado. Sem
mudança de backend. `npm run build`/`npm run lint` limpos a cada mudança.

### Fonte: Khand → Inter (teste do usuário)
- `frontend/index.html` — import do Google Fonts ganhou `Inter:wght@400;
  500;600;700` ao lado de Khand/Hind (Khand manteve o import, só não é mais
  referenciada em nenhum token, caso o usuário queira reverter).
- `frontend/src/index.css` — `--font-display: "Inter", sans-serif;` (era
  `"Khand"`). Como o *token* (`font-display`) continua com o mesmo nome,
  nenhum caller no app precisou ser tocado — só o valor do token mudou.
- **Efeito colateral**: a Inter não é condensada como a Khand era, então
  texto em `uppercase tracking-wide` (que antes cabia bem em Khand) passou a
  ficar largo demais em botões menores e no seletor de mês. Dois ajustes:
  1. **Caixa alta restrita aos botões "superiores"**: só os botões de topo
     de cada página (seletor de mês, "Leitor de fatura", "+ Adicionar
     renda/despesa" — Home, Despesas, Rendas) continuam com
     `uppercase tracking-wide`. Todos os outros ~50 botões do app (abas,
     botões secundários por seção, todos os de dentro de modal, Sidebar,
     Configurações) tiveram `uppercase tracking-wide` removido — mudança
     mecânica em 22 arquivos, sem tocar em elementos que são só *label*
     (texto de `StatCard`/`EconomiaDestaque`, badge "em breve" da Sidebar),
     que continuam em caixa alta por não serem botão.
  2. **Seletor de mês mais largo**: `w-36` (144px) → `w-44` (176px) nas 3
     páginas que o usam (Home, Despesas, Rendas) — o texto do mês não cabia
     mais na largura antiga.

### Borda azul-marinho em todo popup
Pedido do usuário: "quero que todo pop up tenha a borda azul que o leitor de
fatura tem" (`border-2 border-grouper-ink`, que já era exclusiva do
`LeitorFaturaModal` via prop `classeCard`). Virou o **valor padrão** de
`classeCard` em `Modal.tsx` — propaga sozinho pros ~15 modais que usam o
componente genérico, sem precisar editar cada um. `LeitorFaturaModal` não
precisa mais passar `classeCard` explicitamente (removida a duplicação). Os
2 mini-popups de confirmação que vivem dentro do próprio `LeitorFaturaModal`
(fora do `Modal.tsx`, `role="alertdialog"`) ganharam a borda à mão, pra não
ficar inconsistente dentro do mesmo componente.

### Investimento CDB: cor dos botões e remoção do "Resgatar tudo"
- `ResgatarCdbModal.tsx` e `InvestirMaisModal.tsx` (ainda não totalmente
  repaginados, ver `home-layout-atual.md` 4.6) tinham os botões de ação
  principal em `bg-indigo-600` (roxo) — única cor do tipo em todo o app.
  Trocados pra `bg-grouper-mid`/`hover:bg-grouper-deep`, mesmo azul usado em
  "Salvar" dos outros modais.
- **Botão "Resgatar tudo" removido** (pedido do usuário) — junto com todo o
  fluxo de resgate total (`clicarTudo`, o tipo `Modo`, estado por tipo de
  ação). `ResgatarCdbModal` ficou só com o resgate parcial (2 cliques:
  simula → confirma). As funções `resgatarTotalCdb`/`simularResgateTotalCdb`
  continuam em `api/investimentosCdb.ts` (não mexemos no backend/API, só na
  UI) — ficam órfãs no frontend por enquanto.
- Textos soltos (parágrafos explicativos sem fundo/borda) nos popups de
  investimento (`InvestirMaisModal`, `NovoInvestimentoCdbModal` no aviso de
  vínculo com objetivo, `VincularInvestimentoModal`) aumentados de `text-xs`
  pra `text-sm` e escurecidos (`slate-500`→`slate-600`,
  `grouper-navy/60`→`grouper-navy` sólido) a pedido do usuário.

### Tooltip próprio do app (substitui o `title` nativo)
Pedido do usuário: tooltips brancos com texto escuro, não pretos com texto
branco. Causa raiz: os "tooltips" eram o atributo `title` **nativo** do
navegador — cor controlada pelo SO/tema (Windows em modo escuro renderiza
como fundo escuro), impossível de estilizar via CSS. Confirmado com o
usuário (pergunta direta) que a solução certa era um componente próprio, não
uma tentativa de recolorir o nativo.

- **`components/Tooltip.tsx`** (novo) — só CSS/Tailwind, sem lib nova (mesmo
  espírito do resto do app): `<span className="group/tooltip relative
  inline-flex">` envolvendo o gatilho + um balão absoluto
  (`bg-white text-grouper-ink`, `role="tooltip"`), visível em
  `group-hover/tooltip` **e** `group-focus-within/tooltip` (pra continuar
  acessível por teclado). Substituiu os 22 usos de `title=` em 9 arquivos
  (Editar/Excluir em Despesas/Rendas/Home/Objetivos/Categorias/Limites,
  badges "vinculado a", nível de duplicata do leitor de fatura, fixar
  objetivo, "Mostrar mais/menos categorias"). O `title="Em breve"` da
  Sidebar só foi removido (texto já visível sem hover, era redundante) — não
  virou `Tooltip`. A única exceção que não usa o componente é o botão
  "Alterar foto de perfil" em `ConfiguracoesPage.tsx`: ele já é `absolute`
  ancorado no wrapper do avatar, e o `Tooltip` (que também é `relative`)
  quebraria essa âncora — o balão ali é um `<span>` irmão, ligado ao
  hover/foco do botão via `peer` em vez do `group/tooltip` interno.
- **Prop `posicao`** (`"centro"` padrão | `"direita"`): sem JS medindo a
  tela, um balão centralizado vaza pra fora quando o gatilho está perto da
  borda direita de uma lista com `overflow-y-auto` (que também clipa o eixo
  X, ver `a11y-e-responsividade.md`) — bug relatado pelo usuário ("o clipe
  do objetivo tá sendo cortado"). `"direita"` alinha a borda direita do
  balão ao gatilho (cresce só pra esquerda). Aplicado em todo tooltip que
  fica na ponta direita de uma linha: Editar/Excluir (todas as 7 telas),
  badge 🔗 de vínculo, alfinete de fixar objetivo, "Mostrar mais/menos
  categorias". Deixado `"centro"` só no badge de duplicata do leitor de
  fatura (não fica preso numa borda fixa).
- **Bug: tooltip preso na tela até outro clique** — reportado pelo usuário
  no botão de fixar objetivo. Causa: o botão ganha foco ao ser CLICADO (não
  só via Tab), e o tooltip usa `focus-within` pra continuar visível em
  navegação por teclado — então um clique de mouse prendia o balão até outro
  clique tirar o foco. Fix: `onMouseLeave` no wrapper chama `.blur()` no
  `document.activeElement` se ele estiver dentro do próprio tooltip — cobre
  só o caso de foco vindo de mouse (navegação por Tab nunca dispara
  `mouseleave` no meio do processo, então continua funcionando normal).

### Bug: limite de objetivos fixados nunca esvaziava
Reportado pelo usuário: não conseguia mais fixar nenhum objetivo, "como se
já tivesse 2 fixados" — suspeita de que quebrou ao excluir um objetivo
fixado. Confirmado: `ObjetivosResumoHome.tsx` lia o Set de ids fixados do
`localStorage` (`financas.objetivosFixadosHome`) uma única vez ao montar
(`useState(lerFixados)`) e nunca removia um id de lá quando o objetivo
correspondente era excluído (individual ou em lote) — o id órfão ficava
contando pro limite de `MAX_FIXADOS` (2) pra sempre. Fix: novo `useEffect`
que roda toda vez que a prop `objetivos` muda, removendo do Set qualquer id
que não exista mais na lista atual (e persistindo a limpeza de volta no
`localStorage`). Autocorretivo — não precisa de nenhuma ação manual no
`localStorage` do usuário, a primeira vez que a Home recarregar com a lista
de objetivos já limpa o que estiver órfão.

### Verificação
Só frontend, mudanças de estilo/comportamento — usuário testa visualmente
ele mesmo. `npm run build`/`npm run lint` limpos a cada mudança (só os
avisos pré-existentes de `AuthContext`/`PerfilContext`). **Falta o usuário
conferir visualmente**: fonte Inter nos títulos/botões, botões secundários
sem caixa alta, borda azul nos popups, cor dos botões Resgatar/Investir,
tooltips brancos não cortando nas bordas e sumindo ao tirar o mouse, e
fixar/desafixar objetivos funcionando de novo após excluir um fixado.

## Parte 15 — Popups no lugar de confirm()/alert(), gráfico por categoria, unicidade de categoria, e reorganização de cabeçalhos (2026-08-10)

Sessão longa, maioria frontend + um ajuste pontual de backend (unicidade de
categoria). `npm run build`/`npm run lint` limpos a cada mudança;
`mvnw test` com os novos testes de categoria = 29 verdes nos dois arquivos
tocados (suíte completa não re-rodada inteira nesta sessão).

### Incentivo do objetivo virou visível
Campo `incentivo` existia desde a Parte 4 mas nunca aparecia em lugar
nenhum (só salvo, nunca lido na UI) — achado pelo usuário. Ícone `ⓘ`
(`IconeInfo`, novo em `IconesInvestimento.tsx`, mesmo estilo SVG de
Editar/Excluir) ao lado do **título** do objetivo (não mais num canto
separado — reposicionado a pedido do usuário), com `Tooltip` mostrando o
texto do incentivo no hover/foco. Só aparece quando `obj.incentivo` existe.
Aplicado nos dois lugares que listam objetivos: `ObjetivosResumoHome.tsx`
(Home) e `PlanejamentoObjetivos.tsx`. Primeira tentativa usou emoji 💬, depois
`ⓘ` em texto puro (não ficava redondo, dependia da fonte) — resolvido com
SVG próprio + cor mais escura (`text-grouper-navy/70`, hover sólido).

### Todos os `confirm()`/`alert()` nativos viraram popups
Pedido do usuário: "quero que você troque todos os alertas por popups... com
a borda padrão que todo popup já tem". Novo componente genérico
**`components/ConfirmacaoModal.tsx`** (reaproveita `Modal.tsx`, sai com a
borda `border-2 border-grouper-ink` de graça) — título + mensagem + botão
Cancelar/Confirmar (variante `perigo` vermelho ou `neutro` azul), com estado
de "confirmando..." enquanto a ação roda (o `confirm()` nativo bloqueava a
thread e não tinha como mostrar isso). Substituiu os ~13 `confirm()`
restantes (os de exclusão de categoria já tinham popup próprio desde a Parte
7, não mexidos):
- `DespesasPage.tsx`/`RendasPage.tsx` — excluir individual (com aviso
  especial se for recorrente) e em lote.
- `HomePage.tsx` — excluir investimentos CDB selecionados em lote (exclusão
  individual já usava `ExcluirInvestimentoModal`, não mexido).
- `LinhaTempoAportesModal.tsx` — remover aporte.
- `ObjetivosResumoHome.tsx` e `PlanejamentoObjetivos.tsx` — excluir objetivo
  individual e em lote.
- `PlanejamentoLimites.tsx` — excluir limite individual e em lote.
Padrão em todos: estado `confirmandoExclusao: T | "LOTE" | null` guarda o
que está pendente; a função de exclusão (renomeada pra `confirmarExclusao`)
perde o `if (!confirm(...)) return` e passa a ser chamada só pelo
`onConfirmar` do popup.

### Gráfico de barras por categoria em Despesas
Pedido do usuário: ícone de gráfico ao lado do filtro "Todas" em "Despesas
por categoria" (Movimentações → Despesas), abrindo um popup com **todas** as
categorias (não só as visíveis na lista, respeitando o filtro
Todas/Fixas/Variáveis ativo). Novo `IconeGrafico` (`IconesInvestimento.tsx`)
+ novo `components/GraficoCategoriasModal.tsx` (Recharts `BarChart
layout="vertical"` — **barras horizontais**, categoria no eixo Y, valor no
eixo X; a primeira versão saiu com barras verticais por engano, corrigida a
pedido do usuário). A partir de 10 categorias, rolagem **vertical** dentro do
popup (altura fixa por categoria, `overflow-y-auto` com `max-height` de 10
linhas) em vez de espremer as barras.

### Tooltip ganhou posição vertical (`cima`/`baixo`)
Bug relatado: passar o mouse no lápis/X do **primeiro** item de uma lista
com rolagem própria (`overflow-y-auto`) cortava o balão, porque ele abre
`bottom-full` (pra cima) por padrão e não há espaço acima dentro do
container clipado. `Tooltip.tsx` ganhou prop `vertical` (`"cima"` padrão |
`"baixo"`), mesmo raciocínio já usado pra `posicao="direita"` (evitar vazar
pra fora de um container com scroll). Aplicado no primeiro item (`indice ===
0`) de todas as listas afetadas: Despesas, Rendas, Investimento CDB,
Objetivos (Home e Planejamento), Categorias e Limites.

### Fundo decorativo da Sidebar trocado
Pedido do usuário: usar `garoupas_fundo_1.png` (uma versão nova da
ilustração) no lugar do `garoupas_fundo.jpeg` atual. O arquivo **não estava**
em `frontend/public/brand/` — só foi encontrado dentro de
`frontend/dist/brand/` (sobra de um build anterior, nunca commitado). Copiado
pra `public/brand/garoupas_fundo_1.png` e `Sidebar.tsx` atualizado. Heads-up
dado ao usuário: o PNG novo tem 10,5 MB (era 477 KB a jpeg) — compressão
ainda não feita, fica como dívida técnica (mesma observação já registrada em
`home-layout-atual.md` seção 6 sobre o arquivo de fundo).

### Regra de unicidade de categoria (nome + tipo)
Pedido do usuário: impedir criar/editar uma categoria com o mesmo nome de
outra já existente **do mesmo tipo** (Fixa/Variável) — duas categorias podem
ter o mesmo nome se forem de tipos diferentes.
- **Backend**: nova `CategoriaJaExisteException` (409, registrada no
  `GlobalExceptionHandler`); `CategoriaRepository` ganhou
  `existsByNomeIgnoreCaseAndTipoAndUsuarioId` (criar) e a variante
  `...AndIdNot` (editar, excluindo a própria categoria da checagem);
  `CategoriaService.criar()`/`atualizar()` validam antes de salvar. Testes
  novos em `CategoriaServiceTest`/`CategoriaControllerTest` (suíte desses
  dois arquivos = 29 verdes).
- **Frontend**: `SeletorCategoria.tsx` (usado em Nova Despesa, Novo Limite,
  Simular Despesa, Leitor de Fatura) ganhou uma tag colorida com o tipo
  (Fixa/Variável) na frente do nome de cada opção **só quando há duplicata**
  (mesmo nome, tipos diferentes) — evita ambiguidade sem poluir a lista
  normal. O placeholder do campo de busca também mostra o tipo quando a
  categoria selecionada é ambígua.
- Texto de aviso em `AvisoCategoriaSemelhante.tsx` ajustado pra explicar a
  regra nova: "Você pode criar categorias com o mesmo nome, desde que sejam
  de tipos diferentes." (passou por duas iterações de texto com o usuário).

### Bug: categoria nova só aparecia em Limites após F5
Reportado pelo usuário: criar uma categoria no bloco "Categorias" de
Planejamento não atualizava o select de "+ Adicionar limite" no bloco
"Limites" ao lado — cada bloco busca `listarCategorias()` só uma vez ao
montar, e são blocos irmãos independentes (sem estado compartilhado nem
prop drilling). Fix pontual: `PlanejamentoLimites.tsx` ganhou um `useEffect`
que refaz `listarCategorias()` toda vez que o modal abre (`modalAberto` como
dependência), então a lista sempre está fresca no momento em que importa.
Pedido do usuário depois: vasculhar o resto do código atrás do mesmo padrão
de bug — auditoria (via agente Explore) não achou nenhuma outra ocorrência
real (Home usa uma única fonte de verdade compartilhada via props;
Movimentações desmonta de fato a aba inativa; Planejamento/Objetivos não
compete por investimentos com nenhum irmão). Documentado como possível
melhoria futura (não implementada): levantar `categorias` pro componente pai
de Planejamento se mais blocos com esse tipo de dependência cruzada forem
adicionados.

### Reorganização dos cabeçalhos (Movimentações e Planejamento)
Pedido do usuário: os botões de cada página deveriam ficar todos na mesma
linha do título (como a Home já fazia), com o avatar junto — não numa linha
separada.
- **`MovimentacoesPage.tsx`**: título "Movimentações" + controles (seletor
  de mês, "Leitor de fatura", "+ Adicionar despesa/renda", portados via
  `headerSlot` de `DespesasPage`/`RendasPage`) + avatar agora dividem uma
  única linha, mesmo padrão da Home (`flex flex-wrap items-center
  justify-between`). A linha das abas (Despesas | Rendas) ficou sozinha
  logo abaixo, com sua própria borda inferior — antes ela também carregava
  os controles e o avatar.
- **`PlanejamentoPage.tsx`**: os três botões "+ Novo objetivo"/"+ Novo
  limite"/"+ Nova categoria" (cada um no cabeçalho do seu próprio bloco)
  sobem pra linha do título "Planejamento", via o mesmo mecanismo de portal
  (`headerSlot`) que Movimentações já usava — `PlanejamentoObjetivos.tsx`,
  `PlanejamentoLimites.tsx` e `PlanejamentoCategorias.tsx` ganharam uma prop
  opcional `headerSlot` (sem ela, o botão cai no cabeçalho local do bloco,
  fallback igual ao de `DespesasPage`/`RendasPage`). Avatar adicionado
  (Planejamento não tinha nenhum até então).
  - **Texto e cor dos botões, num segundo pedido**: "Novo"/"Nova" →
    "Adicionar" (bate com "+ Adicionar despesa/renda" da Home); estilo
    trocado do secundário (`text-[13px]`, sem caixa alta) pro estilo de
    botão "superior" (`uppercase tracking-wide`, `px-4 py-2`, `w-full
    lg:w-auto`) — já que agora vivem no topo da página, não mais dentro de
    cada bloco. Cores seguem a mesma ordem dos 3 primeiros botões da Home:
    Objetivos = `grouper-deep`→`grouper-ink` (como "Leitor de fatura"),
    Limites = `grouper-mid`→`grouper-deep` (como "+ Adicionar renda"),
    Categorias = `grouper-ink`→`black` (como "+ Adicionar despesa").

### Planejamento — Limites: valor movido pra baixo da barra
Pedido do usuário: em cada item do bloco Limites, "R$X de R$Y" ficava em
cima da barra de progresso (ao lado do nome da categoria); passou pra baixo
da barra, numa linha com "X% do limite" (esquerda/direita) — mesmo padrão
que Objetivos já usava pra "R$X de R$Y" / "meta para DD/MM/AAAA".

### Planejamento — Categorias: filtro Todas/Fixas/Variáveis
Pedido do usuário: mesmo filtro que "Despesas por categoria" (Movimentações)
já tinha. Chips idênticos (mesmo estilo, mesma lógica) adicionados no
cabeçalho local do bloco — que agora sobra livre a maior parte do tempo,
já que o botão "+ Adicionar categoria" foi portado pra linha do título (ver
acima). Filtra a lista, a mensagem de vazio e o "Selecionar todos" (que
passa a valer só pros itens visíveis no filtro).

### Despesas — texto de "Ponto de atenção"/"Ponto de motivação"
Usuário pediu um levantamento de todos os textos possíveis nessa seção
(documentado aqui pra referência futura, não só no chat):
- **Ponto de atenção**, categoria subiu: não mostrava o percentual (só
  R$), diferente de "Ponto de motivação" que já mostrava os dois. Corrigido
  pra mostrar `(±X%)` também, usando a mesma `textoPct()` já existente.
- **Ponto de atenção**, ninguém subiu: "Parabéns, Nenhuma categoria..." tinha
  um "Nenhuma" maiúsculo no meio da frase (typo) — corrigido pra minúsculo.
- Achado no levantamento (não mexido, é código morto): `textoPct()` trata um
  caso `"nova"` (categoria sem gasto no mês anterior) que nunca é alcançado
  na prática, porque `altasOrdenadas`/`baixasOrdenadas`
  (`utils/despesasResumo.ts`) já excluem categorias com `anterior === 0` da
  disputa por maior alta/queda.

### Verificação
Frontend: `npm run build`/`npm run lint` limpos a cada mudança (só os
avisos pré-existentes de `AuthContext`/`PerfilContext`). Backend: testes
novos de categoria rodados isoladamente (29 verdes); backend derrubado e
reiniciado no fim da sessão pra pegar a mudança de unicidade. **Falta o
usuário conferir visualmente**: tudo desta parte é novo desde a última
verificação — popups de confirmação, gráfico de categorias (barras
horizontais + rolagem com 10+), tooltip do primeiro item de cada lista não
cortando mais, fundo novo da Sidebar, criar categoria duplicada (mesmo nome
+ tipo diferente deve funcionar, mesmo tipo deve barrar), tag de
Fixa/Variável aparecendo só quando há nome duplicado, cabeçalhos de
Movimentações/Planejamento numa linha só, cores dos botões de Planejamento,
layout novo do bloco Limites, filtro de Categorias, e os textos ajustados de
Ponto de atenção.

## Parte 16 — Cor do botão e layout do popup "Plano de contenção" (2026-08-10)

Sessão só de frontend, iterando com o usuário vendo cada resultado. `npm run
build`/`npm run lint` limpos a cada mudança.

### Bug: botão continuava verde com a economia bem negativa
Reportado pelo usuário: adicionou despesas até a economia do mês ficar
negativa, e o botão "Plano de contenção" continuou verde. Investigado com os
números reais do usuário (renda fixa R$ 8.658,00 toda fixa; despesas R$
8.822,76 todas variáveis, maior categoria "Farmácia e saúde" R$ 6.500):
- **Primeira suspeita, descartada**: achei que seria despesas do tipo Fixa
  sem nenhuma categoria variável pra cortar (nesse caso
  `dificuldadeContencao()` reduzia a `0/0` e caía em verde por acidente) —
  corrigido, mas não era a causa real do usuário (as despesas dele eram
  variáveis).
- **Causa real**: a cor vinha de uma escala baseada em "% da categoria
  variável **selecionada** que precisa ser cortada pra fechar as contas" —
  com os números do usuário, cortar R$ 164,76 de uma categoria de R$ 6.500
  é só 2,5%, então caía em verde ("tranquilo"), mesmo a economia do mês
  sendo negativa em R$. Confirmado com o usuário que isso não é bug de
  estado, é o critério em si não bater com a expectativa dele.
- **Decisão do usuário** (pergunta direta, 3 opções): trocar o critério
  inteiro pra refletir a economia em si (mesma escala já usada na borda do
  card "Economia do mês"), em vez de manter o critério antigo ou só colocar
  um piso mínimo nele.

### Cor do botão trocada de critério
- `utils/cores.ts` — nova `corEscalaEconomiaBotao(percentual)`: mesma escala
  de `corEscalaEconomia` (vermelho→verde por degraus de 20%, já usada na
  borda do card "Economia do mês"), mas retornando também a cor do texto
  (só o degrau amarelo precisa de texto escuro pra contraste; os outros 4
  funcionam com texto branco). `corEscalaDificuldade` (antiga escala) e
  `dificuldadeContencao()` (`utils/contencaoRendaVariavel.ts`) removidas —
  ficaram órfãs, sem nenhum outro caller.
- `HomePage.tsx` — `corBotaoPlano` agora vem de
  `corEscalaEconomiaBotao(percentualEconomia)`, com `percentualEconomia =
  economia / renda * 100` (clampado 0–100, mesma fórmula do
  `EconomiaDestaque.tsx`).

### Meta do plano: de "não fechar negativo" pra "10% de folga sobre a renda fixa"
Pedido do usuário: em vez de mirar em economia zero (relativa à renda fixa),
mirar em fechar o mês com pelo menos **10% de folga** sobre a renda fixa.
`valorNecessarioReduzir` (`HomePage.tsx`) passou de `max(0, despesas −
rendaFixa)` pra `max(0, despesas − rendaFixa * 0.9)` (constante
`MARGEM_FOLGA_RENDA_FIXA = 0.1`, fácil de ajustar se o valor mudar).

### Layout do popup
Várias iterações pequenas, nesta ordem:
- **Fontes maiores**: textos principais de `text-sm` → `text-base`, avisos
  de `text-xs` → `text-sm`.
- **Aviso de economia negativa**: primeiro só teve a cor trocada de
  preto/cinza pra vermelho (`border-red-600 bg-red-50 text-red-700`) e o
  valor numérico entre parênteses removido do texto; depois moveu de cima
  (antes do texto explicativo) pra baixo da lista de categorias; **por fim,
  removido por completo** a pedido do usuário — não existe mais.
- **Dois parágrafos viraram um só**: a frase "Sua renda fixa não seria
  suficiente..." e "Para não fechar o próximo mês no negativo, considere
  reduzir..." eram `<p>` separados com cores diferentes (`grouper-navy` e
  `grouper-ink`); viraram um único parágrafo, mesma cor (`grouper-ink`),
  depois reduzido pra `text-sm` (pra bater com o tamanho do aviso vermelho
  que existia até então) e por fim posto em **negrito**
  (`font-semibold`).
  - Texto final: "{explicação com/sem renda variável}. Para não fechar o
    próximo mês no negativo e conseguir guardar ao menos 10% da sua renda
    fixa, considere seguir este plano de contenção:" — não cita mais o valor
    total a reduzir nessa frase (esse valor não está mais em nenhum texto
    corrido, só implícito na soma dos cards de categoria).
- **Lista de categorias virou cards**: era uma `<ul>` com `divide-y`
  (linhas simples); virou uma lista de cards (`rounded-lg border-l-4
  border-grouper-red bg-white shadow-sm`, `space-y-2` entre eles) — mesmo
  padrão visual dos blocos "Ponto de atenção"/"Parabéns" de Despesas. Cada
  card: nome + gasto atual à esquerda; valor a cortar em destaque (`text-base
  font-semibold text-grouper-red`) + percentual como legenda menor
  (`text-xs`) à direita.

### Verificação
`npm run build`/`npm run lint` limpos a cada mudança (só os avisos
pré-existentes de `AuthContext`/`PerfilContext`). **Falta o usuário conferir
visualmente**: cor do botão batendo com a economia real do mês em diferentes
cenários, meta de 10% de folga refletida corretamente na sugestão de corte,
e o layout novo do popup (parágrafo único em negrito, cards de categoria,
sem o aviso vermelho).

## Parte 17 — Seletores de data/mês próprios, ajuste dinâmico de fonte e correções de mobile (2026-08-11)

Sessão longa de ajustes de responsividade, guiada pelo usuário testando com
emulação de dispositivo (iPhone) no DevTools do próprio navegador (o
`resize_window` do Claude in Chrome não funciona neste ambiente — verificação
feita via medições JS de `scrollWidth`/`clientWidth`/`getBoundingClientRect`
em vez de screenshot, que se mostrou instável nesta sessão). `npm run
build`/`npm run lint` limpos a cada mudança.

### Avatar e seletor de mês fora do lugar no mobile (bugs de regressão)
Dois ajustes de responsividade anteriores (avatar ao lado do título, sem
mais ficar abaixo dos botões) tinham introduzido regressões:
- **Avatar "subindo" pra posição errada só na Home**: o wrapper do
  `SeletorMes` tinha perdido a classe `w-full` numa limpeza de código —
  sem ela, o item não força quebra de linha no `flex-wrap` mobile e fica
  flutuando na linha do título junto do avatar. Corrigido (`order-3 w-full
  lg:order-none lg:w-auto`).
- Confirmado que Movimentações/Planejamento não tinham o mesmo bug (o
  wrapper lá manteve o `w-full`).

### Seletores de mês/data nativos substituídos por componentes próprios
Pedido inicial: o seletor de mês (`<input type="month">`) vazava da tela no
mobile ao abrir o calendário — investigado e confirmado que o **popup nativo
do navegador não é estilizável nem reposicionável via CSS** (é como um
`<select>` nativo). Única solução real: construir o próprio seletor.

- **`components/SeletorMes.tsx`** (novo) — botão + popup HTML/CSS próprio
  (mês em grade 3×4, navegação de ano). Duas variantes: `cabecalho`
  (botão "cara de botão", usado nos filtros de mês da Home/Movimentações) e
  `formulario` (campo fino, usado dentro de modais, ex.: mês da renda em
  `NovaRendaModal`).
- **`components/SeletorData.tsx`** (novo) — mesma ideia pra dia completo
  (grade de 7×6, navegação de mês), substituindo **todos** os
  `<input type="date">` do app: `NovaDespesaModal`, `AportarModal`,
  `LinhaTempoAportesModal`, `NovoObjetivoModal`, `NovoInvestimentoCdbModal`
  (2 campos). Recebe `min`/`max` (equivalente aos atributos nativos) e uma
  `className` que reaproveita exatamente a do `<input>` antigo de cada
  formulário, pra não mudar a aparência.
- **`components/GradeAnos.tsx`** (novo) — grade de anos em blocos de 12,
  navegável. Pedido do usuário: sem ela, pular de 2026 pra 2045 num
  objetivo exigia clicar "próximo ano" 19 vezes. Agora o rótulo do
  ano/mês-ano nos dois seletores é clicável e abre essa grade (~3 cliques
  pra qualquer ano). Ano volta a ficar **centralizado** entre as setas ‹›
  (chegou a ir pro canto esquerdo, revertido por pedido do usuário — "fica
  melhor no meio"); o botão "Este mês"/"Hoje" ficou alinhado à **esquerda**
  (era centralizado).
- **CSS órfão removido**: a regra em `index.css` que escondia o "x" de
  limpar dos `<input type="date"/"month">` nativos (não existem mais).

#### Bug: popup cortado pela borda do modal
Os popups de `SeletorMes`/`SeletorData` (`position: absolute` dentro do
próprio componente) ficavam cortados pelo `overflow-y-auto` do card de
`Modal.tsx`. Corrigido com `hooks/usePosicaoPopup.ts` (novo): os popups
passaram a renderizar via `createPortal` direto no `<body>`
(`position: fixed`, com clamp pra nunca vazar da tela), escapando de
qualquer `overflow` de ancestral. Exigiu ajustar a detecção de "clique
fora" pra considerar gatilho **e** popup (não estão mais no mesmo galho do
DOM).

#### Bug: popup indo pro canto esquerdo no primeiro clique
Só no `SeletorMes` (não no `SeletorData`): no primeiríssimo clique, o popup
usava `min-w-[15rem]` (largura só mínima) em vez de largura fixa — antes de
virar `position: fixed`, um `<div>` de bloco solto no `<body>` sem largura
fixa ocupa a página inteira, e o `usePosicaoPopup` media essa largura errada
nesse instante, jogando o cálculo pro canto esquerdo. Corrigido trocando
`min-w-[15rem]` por `w-60` (largura fixa) — e, como blindagem geral no
hook, o estado inicial do popup agora já nasce `position: fixed` (fora da
tela) em vez de `{}`, pra nenhum popup futuro cair nessa mesma pegadinha.

#### Bug real encontrado ao dar suporte a mês/ano vazio: crash geral
Ao abrir um modal pela primeira vez, o campo de data começava com `value=""`
(o `useEffect` de preenchimento só roda depois do primeiro render) —
`"".split("-").map(Number)` virava `NaN`, e `new Array(NaN)` no cálculo do
grid do calendário derrubava a árvore React inteira (tela em branco).
Corrigido com fallback pra hoje (`value || hojeISO()`) nos dois
componentes.

#### Bug real de posicionamento: ResizeObserver se autodisparando
No hook de sincronizar fonte entre dois cards (ver seção abaixo), o
`ResizeObserver` observava os próprios elementos cujo `font-size` a função
mutava — mudar o tamanho de um elemento observado dispara o observer de
novo, criando um loop que deixava o resultado preso num valor intermediário
errado. Corrigido nos dois hooks de fonte dinâmica (`useAjustarFonte.ts` e
`useAjustarFonteSincronizada.ts`) trocando `ResizeObserver` por um listener
de `window.resize` (sinal externo real, não afetado pelas próprias
mutações).

### Valores em R$ vazando dos cards (fonte dinâmica)
Reportado: no mobile, "Despesas variáveis" (Movimentações) vazava a última
casa decimal do card. Causa: `StatCard.tsx` usava `text-3xl` fixo, e no
`grid-cols-2` fixo (sem breakpoint) da tela valores como "R$ 8.822,76" não
cabiam na metade da largura.
- **`hooks/useAjustarFonte.ts`** (novo) — em vez de um breakpoint fixo
  (`sm:text-3xl`, tentativa inicial revertida a pedido do usuário: "não
  podemos deixar mais dinâmico?"), mede o texto de verdade
  (`scrollWidth`/`clientWidth`) e encolhe a fonte em passos de `0.125rem`
  até caber, com piso mínimo — funciona pra qualquer tamanho de valor, em
  qualquer largura de tela, sem depender de um breakpoint "adivinhado".
  `truncate` como rede de segurança final.
- **`hooks/useAjustarFonteSincronizada.ts`** (novo) — pedido do usuário:
  fazer o valor menor "acompanhar" o maior entre dois cards vizinhos (ex.:
  Despesas fixas R$ 0,00 vs. Despesas variáveis R$ 8.822,76), em vez de
  cada um encolher sozinho e ficarem com tamanhos de fonte diferentes.
  Mede o tamanho ideal de cada elemento independentemente e aplica o
  **menor** a todos. Conectado via nova prop `valorRef` do `StatCard`
  (usada em `DespesasPage`/`RendasPage`; sem ela, `StatCard` continua se
  ajustando sozinho, como na Home).
- **Título dos `StatCard`s** ("Despesas fixas"/"Despesas variáveis")
  também ganhou `text-xs sm:text-sm` (breakpoint fixo aqui, não dinâmico —
  pedido específico do usuário só pra evitar quebra de linha no nome, não
  pra acompanhar o valor).
- **`EconomiaDestaque.tsx`** (card "Economia do mês" da Home) tinha o
  mesmíssimo problema (`text-3xl` fixo, sem truncate) e não tinha sido
  corrigido junto — achado numa varredura geral pedida pelo usuário depois
  (ver seção "Varredura geral" abaixo) e corrigido com o mesmo
  `useAjustarFonte`.

### Tooltip do incentivo inacessível no mobile
Pergunta do usuário ("como funciona no mobile, informação que só aparece no
hover?") levou a um achado real: `Tooltip.tsx` mostra o balão via `:hover`
(inexistente em touch) e `:focus-within` como alternativa — mas o ícone ⓘ
do incentivo (`ObjetivosResumoHome.tsx`, `PlanejamentoObjetivos.tsx`) e o
selo "Possível duplicata" (`LeitorFaturaModal.tsx`) usavam `<span>`, não
focável, então no mobile essa informação era **inacessível de verdade**.
Corrigido trocando por `<button type="button">` (foco no toque revela o
tooltip; toque fora esconde) + `stopPropagation` nos dois primeiros pra não
também disparar a seleção da linha do objetivo.

### Estrela de fixar objetivo: tooltip removido (quase todo)
Pedido do usuário: tirar o texto que aparecia ao fixar/desafixar um
objetivo (`ObjetivosResumoHome.tsx`). Removido o `<Tooltip>` ao redor do
botão de fixar — mas mantido **só** para o caso de limite atingido ("Só é
possível fixar 2"), a pedido do usuário logo em seguida ("deixe só o texto
quando já tiver 2 fixados").

### Movimentações: abas acima dos botões no mobile
Pedido do usuário: a divisão Despesas/Rendas devia aparecer **acima** dos
botões principais (seletor de mês, Leitor de fatura, Adicionar) no mobile,
não abaixo. Como as abas viviam dentro do grid (pro `lg:col-span-3` do
desktop) e os botões viviam na linha do título (pro layout de uma linha só
do desktop), os dois wrappers (`MovimentacoesPage.tsx`) viraram
`contents`/`lg:flex`/`lg:grid` — no mobile tudo "evapora" pra um único
`flex-wrap` reordenável via `order` (título → avatar → **abas** → botões →
conteúdo → gráfico); no desktop cada wrapper volta a ser uma caixa real,
reconstituindo a estrutura de sempre (título+controles+avatar numa linha,
grid com abas+conteúdo+gráfico embaixo). Verificado pixel-a-pixel igual no
desktop antes/depois.

### Varredura geral (pedida pelo usuário) + correções
"Super vasculhada" em todo o frontend, mobile e desktop, **reportada antes
de aplicar** qualquer coisa (scan automatizado de overflow horizontal —
`scrollWidth`/`getBoundingClientRect` — em todas as páginas e em **todos os
modais** do app, abrindo cada um; grep por `confirm()`/`alert()` nativo
remanescente, `title=` nativo, tooltips hover-only órfãos, imagens sem
`alt`). Achados (2, ambos corrigidos depois de aprovados):
1. `EconomiaDestaque.tsx` com o mesmo bug de `text-3xl` fixo do `StatCard`
   (ver seção acima).
2. **Linhas de lista selecionáveis não alcançáveis via teclado**: o padrão
   "clique na linha inteira pra selecionar" (sem checkbox visível, usado em
   7 arquivos — `RendasPage`, `DespesasPage`, `HomePage` (Investimento
   CDB), `ObjetivosResumoHome`, `PlanejamentoLimites`,
   `PlanejamentoObjetivos`, `PlanejamentoCategorias`) usava `<div onClick>`
   sem `role`, `tabIndex` ou handler de teclado — funcionava no
   mouse/toque, mas não no teclado. Corrigido com `utils/teclado.ts`
   (`aoTeclarAtivar`, novo) + `role="button"` `tabIndex={0}` `onKeyDown` +
   anel de foco visível (`focus-visible:ring-2`) nos 7 lugares. Pré-existia
   antes desta sessão, não era uma regressão.

### Verificação
`npm run build`/`npm run lint` limpos a cada mudança. Testado via medições
JS (não screenshot, instável nesta sessão) em viewport mobile emulado
(iPhone, ~440px) e em aba desktop separada (~1536px): sem overflow
horizontal em nenhuma página/modal, popups de data sempre dentro da tela,
troca de mês/ano funcionando (inclusive pulo direto de 2026→2045),
sincronização de fonte entre cards confirmada (`1.5rem` nos dois), consoles
sempre sem erros. **Falta o usuário conferir visualmente** — a aba com
emulação de dispositivo foi fechada no meio da sessão.

## Parte 18 — Leitor de fatura: atalho "Cartão de crédito" + escolha do mês da fatura (2026-08-13)

Duas melhorias pedidas pelo usuário na etapa final (`categorizacao`) do
`LeitorFaturaModal.tsx`, que hoje só tinha o fluxo manual de
selecionar-itens + escolher-categoria + aplicar em lote. Só frontend —
nenhuma mudança de backend.

### Atalho "Cartão de crédito"
Na prática, quase toda fatura importada é uma única categoria — o atalho
evita repetir o fluxo manual pra esse caso comum.
- Novo utilitário puro `utils/leitorFatura.ts`:
  `encontrarCategoriaCartaoCredito(categorias)` — casa o nome da categoria
  contra um regex tolerante a acento/ordem das palavras
  (`/(cart[aã]o.*cr[eé]dito|cr[eé]dito.*cart[aã]o)/i`), e
  `mesPrincipalDaFatura(itens)` (ver seção seguinte).
- Botão de atalho no painel de categoria (mesma largura de
  `SeletorCategoria`, `lg:w-64`), abaixo do "Aplicar à seleção" existente,
  separado por uma linha divisória. Texto dinâmico: "Criar a categoria
  Cartão de crédito e adicionar todas as despesas" (categoria ainda não
  existe) ou "Adicionar todas as despesas na categoria Cartão de crédito"
  (já existe uma parecida) — nesse segundo caso o nome exibido é sempre
  fixo "Cartão de crédito", não o nome exato encontrado. Cor `grouper-deep`
  (mais escura que o `grouper-mid` do resto do painel, pra se destacar).
  Texto de instrução equivalente ("Você pode categorizar as despesas
  manualmente, ou adicionar todas de uma vez...") logo abaixo do título do
  modal, em negrito (`font-semibold text-grouper-ink`), aproximado do
  título com `-mt-3`.
- **Popup de confirmação** (`pedindoConfirmacaoCartaoTodos`) quando o
  atalho é clicado depois que já existem itens categorizados manualmente
  (`itensProntos.length > 0`) — evita sobrescrever silenciosamente uma
  categorização já feita. Três opções: manter os já categorizados e aplicar
  o atalho só nos restantes (comportamento padrão quando não há conflito),
  ignorar e jogar TUDO (já categorizados + restantes) na categoria de
  cartão, ou cancelar. Sem itens já categorizados, aplica direto sem popup.
- Removida a linha "N categorizada(s) · N restante(s)" (pedido do usuário,
  informação considerada redundante com a lista visível).

### Escolha do mês da fatura (mesReferencia)
Antes, `mesReferencia` de toda despesa importada era sempre herdado
silenciosamente do filtro de mês já selecionado na página que abriu o
modal (prop `mes`) — sem chance de revisão dentro do próprio Leitor de
fatura, mesmo sabendo que a fatura pode fechar num mês e ser paga no
seguinte.
- `mesPrincipalDaFatura(itens)` (`utils/leitorFatura.ts`): moda das datas
  reais (`item.data`, não as linhas já mescladas) dos itens extraídos, em
  "YYYY-MM"; empate resolvido pelo mês mais recente.
- Novo estado `mesEscolhido` (decoupled do prop `mes`, que continua sendo
  usado só na chamada de upload `processarFatura(arquivo, mes)` — o
  backend usa isso só pra preencher `item.mesReferencia`, que o frontend já
  sobrescrevia por conta própria em `salvarTudo`, então nada mudou aí).
  Calculado logo após a fatura ser processada, junto com `mesPrincipal`.
- **Pré-seleção**: se o mês principal da fatura é o mês atual real (ainda
  não fechou), assume que vai ser paga no mês seguinte a ela; se já é um
  mês passado, assume que está sendo paga no próprio mês da fatura.
- **Popup próprio** (`pedindoEscolhaMes`, não embutido na tela de
  categorização — pedido do usuário) abre ao clicar em "Continuar" na
  etapa de categorização (depois do aviso de itens não categorizados, se
  houver). Pergunta é ancorada no **mês da própria fatura**, não no mês
  real de hoje: as duas opções são "Mês da fatura ({mês principal})" e
  "Mês seguinte ({mês principal + 1})" — ex.: fatura majoritariamente de
  julho pergunta entre julho e agosto, não entre o mês real atual e o
  seguinte a ele. Cada opção é um único `<button>` com um quadradinho
  indicador (`rounded-sm border-2`, preenchido de `grouper-mid` quando
  selecionado) ao lado do texto — clicar tanto no quadrado quanto no nome
  seleciona a opção, já que os dois estão dentro do mesmo botão. "← Voltar"
  fecha o popup sem salvar (volta pra categorização); "Confirmar e salvar"
  chama `salvarTudo()`, que agora usa `mesEscolhido` em vez do `mes` da
  página.
- `reiniciar()` restaura `mesEscolhido`/`mesPrincipal`/os dois popups novos
  ao fechar o modal, mesmo padrão dos demais estados internos.

### Verificação
`npm run build` e `npm run lint` limpos a cada mudança. **Falta o usuário
testar ponta a ponta no navegador** (fluxo sugerido: importar fatura sem
categoria de cartão ainda → atalho cria e categoriza tudo; importar outra
já tendo uma categoria parecida com variação de acento/ordem → atalho
reconhece e reaplica a existente; categorizar alguns itens manualmente e
só depois clicar no atalho → popup de conflito aparece com as 3 opções;
conferir que o popup de escolha de mês pergunta relativo ao mês da fatura,
não ao mês real de hoje, e que o `mesReferencia` salvo bate com a escolha).
