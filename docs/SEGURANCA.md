# Segurança — Gestão de Finanças Pessoais

Resumo da auditoria de segurança conduzida entre 13 e 18/08/2026, e das decisões que
continuam valendo no código.

**Estado: auditoria fechada.** Score de risco **83/100 (VERMELHO) → 7/100 (VERDE)**.
14 dos 16 findings corrigidos; 2 abertos, ambos MEDIUM de arquitetura (seção 7).

Ver também: [BACKEND.md](BACKEND.md) · [FRONTEND.md](FRONTEND.md) · [COMO-RODAR.md](COMO-RODAR.md)

---

## 1. O princípio

Segurança não se testa perguntando "funciona?", se testa perguntando **"o que eu esperava que
falhasse realmente falha?"**. Em todo teste desta área, o resultado bom é algo sendo
**recusado**.

Severidade se calibra pelo impacto **neste** app: finanças pessoais, usuário único, local. Não
é o mesmo perfil de risco de um SaaS multi-tenant exposto — dizer isso no relatório vale mais
do que inflar todo finding para CRITICAL.

---

## 2. Segredos

**Nenhuma senha ou chave mora no repositório.** São dois segredos, ambos fora do git:

| Segredo | Onde mora | Quem lê |
|---|---|---|
| `POSTGRES_PASSWORD` | `.env` na raiz (não versionado) **e** variável de ambiente do usuário | `.env` → docker-compose · variável → Spring |
| `JWT_SECRET` | variável de ambiente do usuário | Spring |

`application.properties` referencia `${JWT_SECRET}` e `${POSTGRES_PASSWORD}`. **Sem a
variável, a aplicação não sobe — e isso é proposital**: melhor falhar no start do que rodar
com um segredo conhecido.

**O segredo foi removido do histórico do git** (`git filter-repo --replace-text`, 16/08/2026).
Três coisas que se descobriu no caminho, e que são contraintuitivas:

- O segredo não vivia em 2 commits, e sim em **28 de 32**. Os dois eram os que *introduziram*
  a linha; o Git guarda o conteúdo completo de cada commit, não o diff, então a linha seguiu
  presente na árvore de todos os seguintes.
- Não era só o `application.properties` — eram **3 arquivos**, incluindo dois testes de JWT.
- **`git branch backup-pre-filter-repo` não é backup.** O `filter-repo` reescreve *todas* as
  refs, essa inclusive. O backup que vale é a cópia física da pasta `.git`.

Como todo hash mudou, qualquer outro clone precisa ser refeito com `git clone`, não `git pull`.
Ponta solta aceita: o GitHub pode servir commits antigos por hash direto até o GC dele rodar —
aceitável porque o repositório é privado, sem forks, e a chave já foi rotacionada.

Os testes não usam mais chave fixa: `ChaveHmacDeTeste` gera uma aleatória por execução. Testes
precisam de uma chave HMAC *válida*, nunca de uma *específica*.

---

## 3. Autenticação e sessão

**JWT stateless** com `subject = usuarioId` (não o e-mail). Senhas em BCrypt.

**Janela deslizante**: cada token carrega uma claim `sessaoInicio` (quando a sessão começou de
verdade), preservada em toda reemissão. Cada requisição autenticada renova o token por mais
24h (`jwt.expiration-ms`) e devolve o novo no header `X-Renewed-Token`. A pessoa só é
desconectada após 24h **de inatividade**. `jwt.max-sessao-ms` (7 dias) é um teto absoluto a
partir do primeiro login: mesmo com uso diário, força relogar — limita o estrago de um token
vazado.

`JwtService` depende de um `Clock` injetável (`config/ClockConfig`) em vez de `new Date()`,
para dar para testar com relógio fixo.

**Cuidado de CORS**: `X-Renewed-Token` precisa estar em `setExposedHeaders`, senão o navegador
bloqueia o JS de lê-lo numa resposta cross-origin.

### Rate limit no login (`RateLimitLoginFilter`)

Duas contagens, porque protegem de ataques diferentes:

| Contagem | Teto | Do que protege |
|---|---|---|
| por e-mail | 5 em 15 min | moer **uma conta** com milhares de senhas |
| por IP | 20 em 15 min | uma senha comum contra **muitas contas** |

A segunda existe porque a primeira sozinha não pega o ataque de espalhamento: cada e-mail leva
pouquíssimas tentativas e nenhum chega perto do teto. Janela **deslizante** (cada falha expira
15 min depois dela mesma), não contador fixo que zera de uma vez.

Decisões que valem lembrar:

- **O IP vem de `getRemoteAddr()`, não de `X-Forwarded-For`.** Esse header é escrito pelo
  cliente; confiar nele entregaria a chave da contagem ao atacante. Se um dia entrar um proxy
  reverso na frente, o header passa a valer — mas só depois de configurar quais proxies são
  confiáveis.
- **O filtro não é `@Component`.** Todo bean `Filter` é registrado pelo Boot *antes* da cadeia
  do Spring Security, e portanto antes do CORS: um 429 emitido lá sairia sem
  `Access-Control-Allow-Origin`, o navegador bloquearia a resposta, e o front mostraria "não
  foi possível conectar" em vez da mensagem de bloqueio. Construído dentro do `SecurityConfig`,
  herda o CORS.
- **A contagem não olha se o e-mail existe** — contar só para conta existente criaria uma
  diferença de comportamento observável entre e-mail cadastrado e inexistente, justamente o que
  o 401 genérico esconde.
- **Login certo zera o contador da conta, mas não o do IP.** Ter uma conta válida não dá
  direito a continuar adivinhando as outras.
- **O IP é checado antes do e-mail**, o que impede encher o mapa em memória mandando um e-mail
  diferente a cada requisição.
- `CorpoCacheadoRequest` existe porque o corpo da requisição só pode ser lido uma vez, e o
  filtro precisa do e-mail que está nele. Sem o cache, o controller receberia corpo vazio e o
  login quebraria **para todo mundo**.

---

## 4. Isolamento de dados

Todo service recebe `usuarioId` explícito e confere posse do recurso antes de qualquer
operação. Recurso inexistente e recurso de outro usuário devolvem **o mesmo** 404 — tratar
diferente vazaria a existência do registro alheio.

Nos controllers, o usuário vem sempre de `@AuthenticationPrincipal`, **nunca** de path ou
query param.

---

## 5. Banco de dados

Duas proteções independentes, e ambas importam:

- **Senha forte** (32 caracteres), aplicada com `ALTER USER` no banco em execução. Trocar
  `POSTGRES_PASSWORD` **não** muda a senha de um volume que já existe — o Postgres só lê essa
  variável na primeira inicialização.
- **Bind só em loopback**: `127.0.0.1:5433:5432`. Com `5433:5432` o Docker publica em
  `0.0.0.0` e qualquer máquina da rede fala direto com o banco, **pulando a API, o JWT e toda
  a checagem de dono**. A senha protege se alguém chegar na porta; o bind impede que cheguem.

> **Armadilha:** não use `host.docker.internal` para concluir sobre alcance de rede — no
> Docker Desktop esse nome alcança o loopback do host mesmo com o bind fechado, dando falso
> positivo. Para porta, a fonte confiável é `netstat`.

---

## 6. Validação de entrada e resposta de erro

- **`@Digits(integer = 11, fraction = 2)` em todo `BigDecimal` monetário.** `numeric(38,2)`
  aceita 36 dígitos inteiros sem reclamar, e `@Positive` só olha o sinal, não a grandeza.
  `percentualCdi` ficou de fora desse teto (não é dinheiro): 10.500% do CDI é digitação
  errada, e recusar com 400 é melhor que calcular rendimento fantasioso.
- **`@Size(max = 255)`** em todo campo que grava em `varchar(255)`. `LoginRequest.senha` ficou
  **sem** limite de propósito: quem já tem conta precisa entrar com a senha que cadastrou, e
  um limite novo trancaria essa pessoa para fora.
- **Handler de `DataIntegrityViolationException` → 400 com mensagem fixa.** `ex.getMessage()`
  traz o texto cru do Postgres, com nome de tabela, coluna e constraint — devolver isso entrega
  o desenho do banco a quem sonda a API e não ajuda quem usa o app. O detalhe vai para o log.
- **Teto de listagem** (2000) e `@Size(max = 500)` no lote de despesas — ver
  [BACKEND.md](BACKEND.md) seção 8. São o par um do outro: sem o teto do lote, uma requisição
  infla a própria base até tornar toda listagem cara.
- Upload da fatura: 2MB, extensão `.csv`, content-type numa lista permissiva. **A checagem de
  content-type não é barreira de segurança** — o valor vem do cliente e pode ser forjado. A
  barreira real é o parser, que só lê texto e rejeita o que não casa com o formato. O que a
  checagem entrega é o caso chato e real: mandar o PDF em vez do CSV.

---

## 7. Findings ainda abertos

| ID | Finding | Por que não foi feito |
|---|---|---|
| MED-008 | JWT em `localStorage` | cookie `HttpOnly` reabre CSRF; risco já reduzido pela CSP |
| MED-010 | enumeração de e-mail no registro | exige fluxo de e-mail que o app não tem; o rate limit corta a cadeia |

`nanoid` e `postcss` seguem aparecendo no `npm audit`, ambos só sob o `vite`: rodam no build e
não vão para o navegador. Classificados como informativos, não corrigidos para não mexer no
toolchain.

---

## 8. Duas coisas que se afirmou errado e depois corrigiu

Ficam registradas porque a versão errada é intuitiva e volta fácil:

1. **CSP no backend não protege contra XSS.** CSP se aplica ao documento que carregou a
   página, não à resposta de um `fetch`. O Spring aqui só serve JSON, então a política dele
   nunca é consultada pelo navegador. **A que vale é a do `frontend/vite.config.ts`.**
2. **`ddl-auto=validate` não pega divergência de precisão numérica.** Medido: entidade em
   `precision=38, scale=2` contra coluna `numeric(9,6)` sobe sem reclamar. Ele pega
   coluna/tabela faltando e tipo trocado.

O segundo item tem uma história cara: `cdi_diario.taxa_percentual` era `numeric(38,2)` mas a
taxa tem 6 casas (`0.052531`). O banco arredondava para `0.05`, e como o cálculo compõe dia
após dia, o erro acumulava **sempre para baixo** — em 5 anos, R$ 608 a menos em R$ 10.000. A
causa não foi uma escolha: a entidade não tinha `@Column(precision, scale)`, e o padrão do
Hibernate para `BigDecimal` é exatamente `numeric(38,2)`.

Nenhum teste pegava isso, porque na época toda a suíte rodava com repositório mockado — o bug
estava no schema, não no Java. É o que motivou o Postgres real via Testcontainers, e hoje o
`EsquemaRealTest` cobre o caso gravando `0.052531` e lendo de volta.

---

## 9. Dependências e upgrades

Três CVEs foram fechadas com overrides de versão no `pom.xml` (`postgresql`,
`jackson-databind`, `log4j-api`). O projeto está no **Spring Boot 4.1.0** (a 3.5.x saiu do
suporte OSS em 30/06/2026; não existe 3.6, então o caminho era major).

**A lição que vale guardar do upgrade:** duas das três CVEs teriam regredido **em silêncio**.
O parent 4.1.0 traz `postgresql` 42.7.11 (a versão vulnerável) e `log4j2` 2.25.4, ambos
*abaixo* dos overrides. E a propriedade do Jackson mudou de nome (`jackson-bom.version` virou
`jackson-2-bom.version`, porque a antiga hoje aponta para o Jackson 3).

> **Todo upgrade de parent exige reconferir os overrides de CVE no `dependency:tree`.**
> Passar nos testes não diz absolutamente nada sobre isso.

---

## 10. Como verificar (roteiro rápido)

Detalhes de Windows que já custaram tempo: use **`curl.exe`** (o `curl` do PowerShell é
apelido de `Invoke-WebRequest`) e **`.\mvnw.cmd`** (o `mvnw` sem extensão é script shell e o
PowerShell responde `CommandNotFoundException`, o que engana porque o arquivo existe).

| O que | Como | Resultado **bom** |
|---|---|---|
| Chave do JWT rotacionada | token antigo → `GET /api/despesas` depois de reiniciar | **401** |
| Senha do banco | `docker run --rm -e PGPASSWORD=postgres postgres:16 psql -h host.docker.internal -p 5433 -U postgres -d financas_db -c "select 1;"` | **erro de autenticação** |
| Porta do banco | `netstat -ano \| Select-String ":5433" \| Select-String "LISTENING"` | **uma linha**, `127.0.0.1:5433` |
| CVEs | `.\mvnw.cmd dependency:tree \| Select-String "postgresql:\|jackson-databind\|log4j-api"` | as versões corrigidas |
| Rate limit | 7 POSTs em `/api/auth/login` com e-mail **inexistente** | `401 401 401 401 401 429 429` |
| Nada quebrou | `.\mvnw.cmd test` | 316 testes, 0 falhas |

**Ao testar o rate limit, não use seu e-mail de verdade** — 5 erros bloqueiam por 15 minutos.
Um e-mail inexistente conta igual, de propósito.

E o contrapeso, que é o teste mais importante da lista: **correção de segurança que quebra a
aplicação não é correção, é troca de um problema por outro.**

---

## 11. Regras para trabalho futuro de segurança

- Não reporte finding que você não verificou lendo o código. Ferramenta erra muito.
- `.audit/` não vai para o git (está no `.gitignore`) — confirme antes de gravar.
- Não rode DAST ativo contra nada que não seja a instância local.
- Não corrija e commite de uma vez — apresente os patches e espere aprovação.
- Nunca anote segredo em arquivo, nem em documento de auditoria. Registre *onde* o segredo
  mora, nunca o valor.
