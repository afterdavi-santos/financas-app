# Camada Controller + Segurança JWT — Resumo (para retomar contexto após /clear)

Localização: `src/main/java/com/financas/app/web/` (controllers), `src/main/java/com/financas/app/dto/` (records de request/response), `src/main/java/com/financas/app/security/` (JWT), `src/main/java/com/financas/app/exception/GlobalExceptionHandler.java`.

## Segurança (Spring Security + JWT, stateless)

- `UsuarioAutenticado` (`security/`) — `UserDetails` que envolve a entidade `Usuario`, expõe `getId()`.
- `JwtService` — gera token com `subject = usuarioId` (não o email); lê `jwt.secret`/`jwt.expiration-ms`/`jwt.max-sessao-ms` do `application.properties`. **Sessão com janela deslizante**: cada token carrega uma claim própria `sessaoInicio` (quando a sessão realmente começou, no login), carregada adiante em toda reemissão. `gerarToken` cria uma sessão nova; `renovarToken(usuarioId, sessaoInicio)` reemite mantendo o `sessaoInicio` original com validade renovada (`jwt.expiration-ms`, 24h) — só recusa (retorna vazio) se já passou do teto máximo (`jwt.max-sessao-ms`, 7 dias) desde o login original. Depende de um `Clock` injetável (`config/ClockConfig.java`) em vez de `new Date()` direto, pra dar pra testar com um relógio fixo.
- `JwtAuthenticationFilter` (`OncePerRequestFilter`) — lê `Authorization: Bearer <token>`, resolve o `Usuario` via `UsuarioRepository` e popula o `SecurityContextHolder` com `UsuarioAutenticado`. Depois de autenticar, tenta renovar o token (`JwtService.renovarToken`) e, se conseguir, devolve o token novo no header `X-Renewed-Token` (constante `JwtAuthenticationFilter.HEADER_TOKEN_RENOVADO`) — o frontend intercepta esse header (`api/client.ts`) e atualiza o token salvo. **Atenção**: esse header precisa estar em `CorsConfiguration.setExposedHeaders` (`SecurityConfig`), senão o navegador bloqueia o JS de lê-lo numa resposta cross-origin.
- `SecurityConfig` — stateless, CSRF desabilitado, `permitAll` em `/api/auth/**` e `/error` (forward interno de exceção não tratada), resto autenticado. CORS liberado para `app.cors.allowed-origins` (dev: `http://localhost:5173`).
- Nos controllers, o usuário logado sempre vem de `@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado` — nunca de path/query param. `usuarioAutenticado.getId()` é passado pros services (que já validam posse dos recursos).

## Tratamento de erros

`GlobalExceptionHandler` (`@RestControllerAdvice`) mapeia: `RecursoNaoEncontradoException` → 404, `EmailJaCadastradoException` → 409, `LimiteJaExisteException` → 409, `CategoriaEmUsoException` → 409, `InvestimentoJaVinculadoException` → 409, `OperacaoInvalidaException` → 400, `CredenciaisInvalidasException` → 401, `SenhaAtualInvalidaException` → 401, `FotoInvalidaException` → 400, `FaturaInvalidaException` → 400, `MethodArgumentNotValidException` (`@Valid`) → 400 com lista de campos. Resposta padronizada em `ErrorResponse`.

## Endpoints

- `AuthController` (`/api/auth`) — `POST /registrar`, `POST /login` (retorna JWT). Únicas rotas públicas.
- `CategoriaController` (`/api/categorias`) — CRUD (`CategoriaRequest`/`Response` incluem `tipo`, obrigatório na criação); `DELETE /{id}?cascata=` apaga despesas/limites/recorrências vinculados quando confirmado. `CategoriaResponse` inclui `totalDespesas` (contagem real só em `GET /`, usada pra ranquear as mais usadas no seletor do frontend; `0` nos outros pontos onde o DTO é montado) e `dataCriacao` (sempre o valor real, `null` pra categorias antigas). `GET /semelhantes?nome=` — categorias do usuário com nome parecido (busca por similaridade via `pg_trgm`), usado pra avisar de possíveis duplicatas antes de criar.
- `DespesaController` (`/api/despesas`) — CRUD (sem `tipo` no request — vem da categoria) + `GET /` com filtros (`categoriaId`, `tipo`, `inicio`, `fim`) + `GET /total` + `POST /lote` (`DespesaLoteRequest`, usado pelo leitor de fatura — confirma em bloco, tudo ou nada). `DespesaResponse` inclui `tipo` (derivado da categoria), `recorrente` (true se a despesa nasceu numa categoria FIXA) e `mesReferencia` (nullable — mês que conta pro orçamento, só preenchido em despesas vindas do Leitor de fatura; ver `service-layer.md` item 3 e `frontend-home.md` Parte 13). `DespesaRequest.mesReferencia` também é opcional, aceito tanto no `POST /` normal quanto no `POST /lote`.
- `RendaController` (`/api/rendas`) — CRUD + `GET /total?mesReferencia`. `RendaResponse` inclui `recorrente` (true se `tipo=FIXA`).
- `ObjetivoController` (`/api/objetivos`) — CRUD + `GET/POST/PUT/DELETE /{id}/aportes` (linha do tempo de aportes) + `PUT`/`DELETE /{id}/investimento-cdb` (vincula/desvincula um `InvestimentoCdb`).
- `InvestimentoCdbController` (`/api/investimentos-cdb`) — CRUD (só descrição/%CDI editáveis — valor/data vivem nos lotes) + `GET /{id}/posicao` + `POST /{id}/investir-mais` + `POST /{id}/simular-resgate(-total)` + `POST /{id}/resgatar(-total)`. `InvestimentoCdbResponse` inclui `objetivoId`/`objetivoDescricao` quando vinculado.
- `CdiController` (`/api/cdi`) — `GET /atual` (taxa diária mais recente + anualizada).
- `LimiteCategoriaController` (`/api/limites-categoria`) — CRUD + `GET /status?categoriaId&mesReferencia`. **Limite é fixo por categoria** (não tem `mesReferencia`); `criar` recusa um segundo limite na mesma categoria (409). `/status` recebe `mesReferencia` porque o *gasto* é sempre avaliado num mês contra o teto fixo.
- `RelatorioController` (`/api/relatorios`) — `GET /economia?mesReferencia`, `GET /comparar-meses?inicio&fim`.
- `UsuarioController` (`/api/perfil`) — página de Configurações: `GET /me` (dados do usuário logado), `PUT /` (nome/email, exige `senhaAtual`), `PUT /senha` (troca senha, exige `senhaAtual`, 204), `PUT /foto`/`DELETE /foto` (foto em base64 no corpo, guardada como `bytea`). `PerfilResponse.fotoBase64` já vem como data URI (`data:image/png;base64,...`) — o frontend usa direto num `<img src>`, sem endpoint binário separado (evita ter que mandar o header `Authorization` num `<img>`, que não dá pra fazer).
- `LeituraFaturaController` (`/api/leitura-fatura`) — `POST /processar` (multipart, `arquivo`), devolve `ProcessarFaturaResponse` (itens importáveis + itens ignorados/estorno). Não persiste nada — só lê e devolve a lista pro frontend revisar.

Padrão de DTO: `XRequest` (record com Bean Validation) + `XResponse` (record), mapeamento manual (`toEntity`/`toResponse`) como métodos privados estáticos dentro do próprio controller — sem mapper genérico.

## Vínculo Investimento ↔ Objetivo

Um `InvestimentoCdb` pode estar vinculado a no máximo um `Objetivo` (e vice-versa). O vínculo é sempre feito pelos endpoints do lado do Objetivo (`PUT`/`DELETE /objetivos/{id}/investimento-cdb`) — o frontend orquestra a criação/edição/vínculo em sequência a partir do popup de investimento (cria ou atualiza o investimento, depois vincula/desvincula/cria o objetivo conforme a escolha do usuário). Excluir um investimento vinculado desvincula automaticamente o objetivo (não apaga); o frontend oferece a opção de apagar os dois.

## Estado dos testes

242 testes no total (services + controllers, um arquivo de teste por controller via `@WebMvcTest`).

### Pegadinha de `@WebMvcTest` + Spring Security

`JwtAuthenticationFilter` é um bean `Filter`, então o `@WebMvcTest` o inclui automaticamente no contexto mesmo sem pedir — e ele quebra porque suas dependências (`JwtService`, `UsuarioRepository`) não fazem parte do slice. Solução: excluir o filtro via `excludeFilters` no `@WebMvcTest` e simular o usuário autenticado com `SecurityMockMvcRequestPostProcessors.authentication(...)`. Sem uma `SecurityConfig` própria carregada no slice, o Spring Boot usa sua cadeia de segurança padrão (nega tudo, CSRF habilitado) — por isso os testes de POST/DELETE também precisam de `.with(csrf())`.

## Ambiente local (rodar `mvnw` depois de um /clear)

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd -q test
```

## Próximo passo

- Leitor automático de fatura **concluído** (CSV Nubank, ver `LeituraFaturaController`). Backlog restante: deploy em nuvem (Supabase + Render/Railway/Fly.io), anexo de comprovante (ver `PROJECT_SCOPE.md` seção 5).
