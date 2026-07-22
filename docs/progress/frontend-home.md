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

## Parte 2 — Relatórios (única parte do menu que falta)
Página `Relatórios` (ainda "em breve" na Sidebar): gráfico de gastos por
categoria (Recharts, agrupando a lista de despesas no front) e comparativo
mês a mês (`GET /api/relatorios/comparar-meses` → `ResumoMensal[]`:
`{mes, totalRenda, totalDespesas, economia}`). Considerar a skill `dataviz`.
