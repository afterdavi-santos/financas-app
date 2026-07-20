# Camada Controller + Segurança JWT — Resumo (para retomar contexto após /clear)

Localização: `src/main/java/com/financas/app/web/` (controllers), `src/main/java/com/financas/app/dto/` (records de request/response), `src/main/java/com/financas/app/security/` (JWT), `src/main/java/com/financas/app/exception/GlobalExceptionHandler.java`.

## Segurança (Spring Security + JWT, stateless)

- `UsuarioAutenticado` (`security/`) — `UserDetails` que envolve a entidade `Usuario`, expõe `getId()`.
- `JwtService` — gera token com `subject = usuarioId` (não o email); lê `jwt.secret`/`jwt.expiration-ms` do `application.properties`.
- `JwtAuthenticationFilter` (`OncePerRequestFilter`) — lê `Authorization: Bearer <token>`, resolve o `Usuario` via `UsuarioRepository` e popula o `SecurityContextHolder` com `UsuarioAutenticado`.
- `SecurityConfig` — stateless, CSRF desabilitado, `permitAll` em `/api/auth/**`, resto autenticado.
- Nos controllers, o usuário logado sempre vem de `@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado` — nunca de path/query param. `usuarioAutenticado.getId()` é passado pros services (que já validam posse dos recursos).

## Tratamento de erros

`GlobalExceptionHandler` (`@RestControllerAdvice`) mapeia: `RecursoNaoEncontradoException` → 404, `EmailJaCadastradoException` → 409, `CredenciaisInvalidasException` → 401, `MethodArgumentNotValidException` (`@Valid`) → 400 com lista de campos. Resposta padronizada em `ErrorResponse`.

## Endpoints

- `AuthController` (`/api/auth`) — `POST /registrar`, `POST /login` (retorna JWT). Únicas rotas públicas.
- `CategoriaController` (`/api/categorias`) — CRUD.
- `DespesaController` (`/api/despesas`) — CRUD + `GET /` com filtros (`categoriaId`, `tipo`, `inicio`, `fim`) + `GET /total`.
- `RendaController` (`/api/rendas`) — CRUD + `GET /total?mesReferencia`.
- `ObjetivoController` (`/api/objetivos`) — CRUD + `POST /{id}/aportar`.
- `LimiteCategoriaController` (`/api/limites-categoria`) — CRUD + `GET /status?categoriaId&mesReferencia`.
- `RelatorioController` (`/api/relatorios`) — `GET /economia`, `GET /comparar-meses`, `GET /comparar-anos`.

Padrão de DTO: `XRequest` (record com Bean Validation) + `XResponse` (record), mapeamento manual (`toEntity`/`toResponse`) como métodos privados estáticos dentro do próprio controller — sem mapper genérico.

## Estado dos testes

87 testes no total (49 de service + 38 de controller/`@WebMvcTest`, um arquivo de teste por controller).

### Pegadinha de `@WebMvcTest` + Spring Security

`JwtAuthenticationFilter` é um bean `Filter`, então o `@WebMvcTest` o inclui automaticamente no contexto mesmo sem pedir — e ele quebra porque suas dependências (`JwtService`, `UsuarioRepository`) não fazem parte do slice. Solução: excluir o filtro via `excludeFilters` no `@WebMvcTest` e simular o usuário autenticado com `SecurityMockMvcRequestPostProcessors.authentication(...)`. Sem uma `SecurityConfig` própria carregada no slice, o Spring Boot usa sua cadeia de segurança padrão (nega tudo, CSRF habilitado) — por isso os testes de POST/DELETE também precisam de `.with(csrf())`.

## Ambiente local (rodar `mvnw` depois de um /clear)

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd -q test
```

## Próximo passo

- Testar o fluxo fim a fim com Postgres rodando (`mvnw spring-boot:run` + registrar/login/CRUD via curl ou Postman).
- Definir estratégia de refresh token / expiração (hoje o token dura 24h, sem renovação).
