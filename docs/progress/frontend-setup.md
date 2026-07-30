# Frontend — Setup + Autenticação (Resumo para retomar contexto após /clear)

Localização: pasta `frontend/` na raiz do repo (mesmo repositório do backend). Branch de trabalho: `frontend` (só mergeia na `master` quando estiver funcionando ponta a ponta).

## Stack escolhida

- **Vite 8** (scaffold + dev server + build). `npm run dev` sobe em `http://localhost:5173`.
- **React 19 + TypeScript** (template `react-ts`). `tsconfig.app.json` tem `verbatimModuleSyntax: true` → imports só de tipo precisam usar `import type { ... }` (senão o build quebra).
- **Tailwind CSS 4** via plugin `@tailwindcss/vite` (NÃO usa `tailwind.config.js` nem `postcss` como na v3). Ativado em `vite.config.ts` (`tailwindcss()`) + `src/index.css` com uma linha só: `@import "tailwindcss";`.
- **react-router-dom 7** (roteamento SPA).
- **axios** (cliente HTTP).
- **recharts 3** instalado, ainda não usado (fica para o dashboard nos próximos marcos).

## Estrutura de `frontend/src/`

- `types/auth.ts` — interfaces espelhando os DTOs do backend (`RegistroRequest`, `LoginRequest`, `TokenResponse`, `UsuarioResponse`). Manter em sincronia com os records Java.
- `api/client.ts` — instância única do axios com `baseURL: http://localhost:8080/api` + **interceptor de request** que injeta `Authorization: Bearer <token>` lendo o `localStorage` (chave `financas.token`, exportada como `TOKEN_KEY`).
- `api/auth.ts` — `registrar()` (POST /auth/registrar) e `login()` (POST /auth/login).
- `api/erros.ts` — `mensagemDeErro(erro)`: traduz `AxiosError` na `mensagem`/`erros` do `ErrorResponse` do backend; detecta backend offline (`!erro.response`).
- `context/AuthContext.tsx` — Context API guardando `token`; `login(token)` persiste no localStorage + atualiza estado, `logout()` limpa. Hook `useAuth()`. Estado inicial lido do localStorage (sobrevive a reload).
- `routes/ProtectedRoute.tsx` — redireciona para `/login` (via `<Navigate replace>`) se `!isAuthenticated`.
- `pages/LoginPage.tsx`, `pages/RegisterPage.tsx` — formulários controlados (`useState`), tratam erro via `mensagemDeErro`. Registro redireciona para `/login` com `state: { registrado: true }` (Login mostra aviso verde de sucesso).
- `pages/DashboardPage.tsx` — placeholder da rota protegida `/` + botão Sair.
- `App.tsx` — `<AuthProvider>` por fora, `<BrowserRouter>` com rotas `/login`, `/registrar`, `/` (protegida).

## Mudança no BACKEND necessária para o front funcionar: CORS

- `SecurityConfig.java` ganhou `.cors(...)` + bean `corsConfigurationSource()` liberando o(s) origin(s) da property nova `app.cors.allowed-origins` (default `http://localhost:5173`) para `/api/**`, métodos GET/POST/PUT/DELETE/OPTIONS, todos os headers.
- Property adicionada em `application.properties`. Sem CORS o navegador bloqueia as chamadas do front por Same-Origin Policy.
- 87 testes do backend continuam passando após a mudança.

## Estado / verificação feita

- `npm run build` (tsc + vite build) passa limpo.
- Dev server sobe em ~570ms e serve a página (`<title>Gestão de Finanças</title>`).
- **Ainda NÃO testado o fluxo real** contra o backend rodando (registrar/login/token). Fazer isso:
  1. `docker-compose up -d` (Postgres na 5433)
  2. `$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"; .\mvnw.cmd spring-boot:run`
  3. `cd frontend; npm run dev`
  4. Navegador: `/registrar` → cria usuário → volta pro `/login` com aviso verde → login → cai no `/` (dashboard). Reload não desloga. Aba anônima em `/` redireciona pro `/login`.

## Próximo passo

- Rodar a verificação ponta a ponta acima com o backend de pé.
- Depois: telas de CRUD (Categorias, Despesas, Rendas) consumindo os controllers, e o dashboard com gráficos Recharts (usando `RelatorioController`).
