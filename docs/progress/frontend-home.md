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
