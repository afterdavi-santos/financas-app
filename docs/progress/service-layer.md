# Camada Service — Resumo (para retomar contexto após /clear)

Localização: `src/main/java/com/financas/app/service/`
Testes: `src/test/java/com/financas/app/service/` — unitários com Mockito + AssertJ, mockando os Repositories, sem precisar de Postgres rodando.

## Padrão comum a quase todos os services

- Todo método recebe `usuarioId` explícito (isolamento de dados por usuário).
- Método privado `buscarOuFalhar(id, usuarioId)` busca a entidade e já confere se pertence ao usuário; se não existir ou for de outro usuário, lança `RecursoNaoEncontradoException` (pacote `com.financas.app.exception`) — os dois casos tratados igual, pra não vazar pra um usuário que o registro de outro existe.
- Services trabalham direto com as entidades JPA (ou constroem DTOs de resposta quando o cálculo é complexo, ex.: `InvestimentoCdbService`).

## Services

1. **UsuarioService** — `cadastrar` (valida e-mail único, hasheia senha com `BCryptPasswordEncoder`), `autenticar`. Exceções: `EmailJaCadastradoException`, `CredenciaisInvalidasException`.
2. **CategoriaService** — CRUD. Toda categoria tem `tipo` (`TipoCategoria.FIXA`/`VARIAVEL`, obrigatório) — despesas lançadas nela herdam esse tipo (ver `DespesaService` abaixo). `criar` preenche `Categoria.dataCriacao` (`LocalDateTime.now()`; categorias de antes desse campo existir ficam com `null`, sem backfill) — usado pelo frontend pra excluir categorias recém-criadas do "Ponto de atenção" (`maiorAlta` em `despesasResumo.ts`: uma categoria que nasceu neste mês não tem uma "alta" real pra comparar). `excluir(usuarioId, categoriaId, cascata)`: sem `cascata`, recusa (`CategoriaEmUsoException`, 409) se houver despesa/limite/recorrência vinculados; com `cascata=true`, apaga despesas, `RecorrenciaDespesa` e limites da categoria antes de apagar ela.
   - **Busca por similaridade** (`buscarSemelhantes`): usa a extensão `pg_trgm` do Postgres (`similarity(nome, :nome) > limiar`, `CategoriaRepository.buscarSemelhantes`, native query — não o operador `%`, pra controlar o limiar explicitamente pelo Java em vez do GUC de sessão). `LIMIAR_SEMELHANCA = 0.35` (levemente acima do padrão 0.3 do pg_trgm — nomes de categoria são curtos e 0.3 tende a dar falso positivo). Usado pelo frontend pra avisar (sem bloquear) quando o nome de uma categoria nova é parecido com uma já existente. A extensão é habilitada no startup por `config/PgTrgmConfig.java` (`ApplicationRunner` rodando `CREATE EXTENSION IF NOT EXISTS pg_trgm`, idempotente — este projeto não tem Flyway).
   - **Contagem de uso** (`contarDespesasPorCategoria`): `Map<categoriaId, totalDespesas>` via `DespesaRepository.contarPorCategoria` (JPQL `GROUP BY`), usado pelo frontend pra ranquear as categorias mais usadas no seletor.
3. **DespesaService** — CRUD (a categoria informada precisa ser do mesmo usuário) + `listar` com filtros combináveis via `DespesaSpecification` (Specification API do Spring Data) + `calcularTotalPorPeriodo`/`calcularTotalPorCategoriaEPeriodo`. `tipo` não é mais um campo próprio da despesa — é sempre derivado de `despesa.getCategoria().getTipo()` na resposta (ver DTO).
   - **Recorrência mensal automática**: toda despesa criada numa categoria `FIXA` nasce vinculada a uma `RecorrenciaDespesa` própria (série independente — uma categoria FIXA pode ter vários itens fixos distintos, ex.: Netflix e Spotify em "Assinaturas"). Um catch-up preguiçoso (`garantirRecorrenciasAteHoje`, chamado no topo de `listar`/`calcularTotalPorPeriodo`/`calcularTotalPorCategoriaEPeriodo`, `@Transactional`) gera as linhas reais dos meses que faltam, copiando `descricao`/`valor` da ocorrência mais recente — por isso editar a ocorrência atual já vira a base dos próximos meses, sem lógica extra. `excluir()`: se a linha excluída é a mais recente da série, marca `RecorrenciaDespesa.ativa=false` (encerra a recorrência) e some do mês atual; ocorrências de meses passados nunca são tocadas (relatórios antigos ficam intactos). `RecorrenciaDespesa.diaDoMes` é fixado na criação (não relido da última linha gerada) pra não "encolher" pra sempre depois de atravessar um mês curto (ex.: dia 31 → fevereiro → dia 31 de novo em março).
   - **Atenção**: `Specification.where(spec)` está deprecado desde Spring Data JPA 3.5. Usar a spec base diretamente: `DespesaSpecification.comUsuario(id).and(...)`.
4. **RendaService** — CRUD + `calcularTotalMes`. Múltiplas rendas no mesmo mês são permitidas (`RendaRepository.findByUsuarioIdAndMesReferencia` retorna `List<Renda>`). Mesmo mecanismo de recorrência do item 3, espelhado para `tipo == TipoRenda.FIXA` (via `RecorrenciaRenda`, sem clamping de dia — `mesReferencia` é sempre dia 1).
5. **ObjetivoService** — CRUD + `aportar`/`editarAporte`/`removerAporte` (cada aporte é uma linha própria em `Aporte`, não só um incremento de `valorAtual`) + `vincularInvestimento`/`desvincularInvestimento`. Quando vinculado a um `InvestimentoCdb`, `valorAtual` deixa de ser o saldo de aportes manuais e passa a ser a posição AO VIVO do investimento (`comValorAtualEfetivo`); aportar/editar/remover aporte fica bloqueado enquanto o vínculo existir. Um investimento só pode estar vinculado a um objetivo por vez (`InvestimentoJaVinculadoException`, 409).
6. **InvestimentoCdbService** — CDB com rendimento calculado a partir do CDI real (via `CdiService`). Cada investimento é um container de "lotes" (`AporteCdb`): o aporte inicial e cada "investir mais" viram um lote próprio, com seu próprio relógio de rendimento — assim aportar mais dinheiro nunca apaga o rendimento já acumulado nos lotes anteriores. `posicao()`/`valorAtual()` aplicam `fatorCdi ^ (percentualCdi/100)` (convenção de mercado pra título "% do CDI") sobre cada lote. Resgate (parcial ou total) consome lotes em FIFO com gross-up de IOF/IR regressivos (`util/ImpostosCdb`) e cria uma `Renda` automática (`tipo=RETORNO_INVESTIMENTOS`) no mês do resgate — CDB fica fora de `Renda` até ser efetivamente resgatado. `excluir()` desvincula (não apaga) qualquer `Objetivo` vinculado antes de apagar o investimento.
7. **CdiService** — cache local (`CdiDiario`) da taxa CDI diária (BCB, série SGS 12), acessado via `BcbCdiClient`. `garantirCache` faz backfill preguiçoso sob demanda (só busca o que falta), quebrado em pedaços de ~1 ano (`salvarChunk`) — uma falha pontual num pedaço não trava o histórico inteiro, e cada pedaço tem seu próprio cooldown de 20 min em memória (`tentativasSemDadoNovo`) pra não bater no BCB repetidamente quando não há dado novo (ex.: consultar "hoje" antes da publicação diária).
8. **LimiteCategoriaService** — CRUD + `verificarLimite`. O limite é **fixo por categoria** (sem `mesReferencia` na entidade): `criar` recusa um segundo limite na mesma categoria (`LimiteJaExisteException`, 409). `verificarLimite(usuarioId, categoriaId, mesReferencia)` compara o gasto do mês informado (via `DespesaService`, que já dispara o catch-up de recorrência) contra o teto fixo.
9. **RelatorioService** — sem entidade própria, junta `RendaService` + `DespesaService`: `calcularEconomiaDoMes` (renda − despesas de um mês) e `compararMeses` (lista de `ResumoMensal` por mês num intervalo).

## Estado dos testes

176 testes unitários, todos passando.

## Ambiente local (rodar `mvnw` depois de um /clear)

`JAVA_HOME` não está setado globalmente nesta máquina. No PowerShell, antes de qualquer `mvnw`:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd -q test
```

Relatórios de teste ficam em `target/surefire-reports/*.txt`.

## Próximo passo

Backlog (ver `PROJECT_SCOPE.md` seção 5): leitor automático de fatura em PDF, deploy em nuvem (Supabase + Render/Railway/Fly.io), anexo de comprovante. Nenhuma mudança de arquitetura pendente no momento — camadas Service/Controller/Security já cobrem o MVP completo.
