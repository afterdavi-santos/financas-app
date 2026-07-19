# Camada Service — Resumo (para retomar contexto após /clear)

Localização: `src/main/java/com/financas/app/service/`
Testes: `src/test/java/com/financas/app/service/` — unitários com Mockito + AssertJ, mockando os Repositories, sem precisar de Postgres rodando.

## Padrão comum a quase todos os services

- Todo método recebe `usuarioId` explícito (isolamento de dados por usuário).
- Método privado `buscarOuFalhar(id, usuarioId)` busca a entidade e já confere se pertence ao usuário; se não existir ou for de outro usuário, lança `RecursoNaoEncontradoException` (pacote `com.financas.app.exception`) — os dois casos tratados igual, pra não vazar pra um usuário que o registro de outro existe.
- Services trabalham direto com as entidades JPA, sem DTO ainda (fica pra quando os Controllers existirem).

## Services criados

1. **UsuarioService** — `cadastrar` (valida e-mail único, hasheia senha com `BCryptPasswordEncoder`), `autenticar`. Exceções: `EmailJaCadastradoException`, `CredenciaisInvalidasException`.
   - Dependência nova no `pom.xml`: `spring-security-crypto` (só hashing, sem puxar o autoconfig completo do Spring Security ainda) + bean `PasswordEncoder` em `com.financas.app.config.PasswordEncoderConfig`.
2. **CategoriaService** — CRUD simples.
3. **DespesaService** — CRUD (valida que a categoria informada é do mesmo usuário) + `listar` com filtros combináveis via `DespesaSpecification` (Specification API do Spring Data, pra não explodir em derived query methods) + `calcularTotalPorPeriodo` e `calcularTotalPorCategoriaEPeriodo`.
   - **Atenção**: `Specification.where(spec)` está deprecado desde Spring Data JPA 3.5 (remoção prevista na 4.0). Usar a spec base diretamente: `DespesaSpecification.comUsuario(id).and(...)` em vez de `Specification.where(comUsuario(id))`.
4. **RendaService** — CRUD + `calcularTotalMes`. Decisão confirmada com o usuário: **múltiplas rendas no mesmo mês são permitidas** (ex: salário + freela na mesma referência). Por isso `RendaRepository.findByUsuarioIdAndMesReferencia` retorna `List<Renda>`, não `Optional<Renda>`.
5. **ObjetivoService** — CRUD + `aportar` (incrementa `valorAtual`). `valorAtual` começa em zero se não informado na criação.
6. **LimiteCategoriaService** — CRUD + `verificarLimite` (compara o gasto do mês na categoria, via `DespesaService`, contra `valorLimite`; retorna o record `StatusLimiteCategoria`: `valorLimite`, `valorGasto`, `estourado`).
7. **RelatorioService** — sem entidade própria, junta `RendaService` + `DespesaService`:
   - `calcularEconomiaDoMes` (renda − despesas de um mês)
   - `compararMeses` (lista de `ResumoMensal` por mês num intervalo)
   - `compararAnos` (agrega os meses em `ResumoAnual` por ano)

## Estado dos testes

49 testes unitários, todos passando.

## Ambiente local (rodar `mvnw` depois de um /clear)

`JAVA_HOME` não está setado globalmente nesta máquina. No PowerShell, antes de qualquer `mvnw`:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd -q test
```

Relatórios de teste ficam em `target/surefire-reports/*.txt`.

## Próximo passo

Camada Controller (endpoints REST), provavelmente com DTOs de request/response, e a configuração real de autenticação (Spring Security + JWT/sessão) — hoje só existe o hashing de senha, sem filtro de segurança nenhum ainda.
