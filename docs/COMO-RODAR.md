# Como rodar o projeto (dev)

Três peças: **Postgres** (Docker), **backend** (Spring Boot) e **frontend** (Vite/React).

Ver também: [BACKEND.md](BACKEND.md) · [FRONTEND.md](FRONTEND.md) · [SEGURANCA.md](SEGURANCA.md)

## Pré-requisitos

- **Java 21** (JDK) com `JAVA_HOME` apontando para a **raiz** do JDK.
- **Node.js 18+** e npm.
- **Docker Desktop**.

---

## 0. Segredos e `JAVA_HOME` (uma vez por máquina)

Nenhuma senha mora no repositório. São dois segredos, em dois lugares:

| Segredo | Onde mora | Quem lê |
|---|---|---|
| `POSTGRES_PASSWORD` | arquivo `.env` na raiz **e** variável de ambiente do usuário | `.env` → docker-compose · variável → Spring |
| `JWT_SECRET` | variável de ambiente do usuário | Spring |

O `.env` não é versionado; copie o `.env.example` e preencha. Para gerar a chave do JWT
(512 bits, o que o HS512 exige):

```powershell
python -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(64)).decode())"
```

```powershell
[Environment]::SetEnvironmentVariable('JWT_SECRET','<a chave gerada>','User')
[Environment]::SetEnvironmentVariable('POSTGRES_PASSWORD','<a mesma senha do .env>','User')
[Environment]::SetEnvironmentVariable('JAVA_HOME','C:\Program Files\Java\jdk-21','User')
```

O `JAVA_HOME` entra na mesma leva. Não é segredo, mas é a mesma armadilha: sem ele o
`mvnw.cmd` aborta antes de compilar, com `JAVA_HOME not found in your environment`. O `java`
solto no PATH funciona (o instalador põe um atalho lá), mas o Maven precisa da **raiz** do
JDK, e o erro não deixa isso óbvio.

> **Depois de criar as variáveis, feche e reabra o terminal — e a IDE.** Um processo só
> enxerga variável que já existia quando ele foi iniciado. Terminal velho não vê a variável
> nova, e o sintoma engana: o app falha no start por placeholder não resolvido.
>
> Falhar no start é **proposital**: melhor não subir do que subir com um segredo conhecido.

---

## 1. Banco de dados

Na raiz do projeto:

```powershell
docker-compose up -d
```

Sobe o container `financas-postgres` (`postgres:16`), banco `financas_db`, usuário `postgres`,
senha do `.env`, na porta **5433** do host (a 5432 costuma estar ocupada). Os dados persistem
no volume `financas-postgres-data`.

A porta é publicada em `127.0.0.1:5433`, **só loopback** — ver [SEGURANCA.md](SEGURANCA.md)
seção 5.

> **Trocar `POSTGRES_PASSWORD` não muda a senha de um volume que já existe** — o Postgres só
> lê essa variável na primeira inicialização. Num banco já criado, a troca é com `ALTER USER`
> no banco em execução.

Desligar: `docker-compose down` (mantém os dados) ou `docker-compose down -v` (apaga o volume
também).

---

## 2. Backend

Na raiz, no **PowerShell**:

```powershell
.\mvnw.cmd spring-boot:run
```

- Sobe em `http://localhost:8080`, rotas sob `/api`.
- O schema é aplicado pelo **Flyway** antes de o contexto subir. O Hibernate está em
  `ddl-auto=validate`: ele **confere** e não altera nada. Mudou entidade? A migração é
  obrigatória — sem ela o app não sobe.
- CORS liberado para `http://localhost:5173`.

No log de subida, dois sinais de que deu certo: uma linha `Migrating schema "public" to
version ...` quando há migração nova, e a **ausência** de `SchemaManagementException` — o app
subir em silêncio já é a prova de que migração e entidades descrevem a mesma coisa.

Testes:

```powershell
.\mvnw.cmd -q test
```

**O Docker Desktop precisa estar rodando**, mas o `docker-compose up` **não**: os testes de
persistência sobem o próprio Postgres 16 descartável via Testcontainers, com o schema vindo
das mesmas migrações do Flyway. O container é `static` — sobe uma vez por suíte (~20s), não
por classe. Com o Docker parado, esses testes falham no start do contexto.

Relatórios em `target/surefire-reports/*.txt`.

---

## 3. Frontend

```powershell
cd frontend
npm install   # só na primeira vez (ou quando o package.json mudar)
npm run dev
```

- Sobe em `http://localhost:5173`, fala com `http://localhost:8080/api` (`src/api/client.ts`).
- Build: `npm run build` (tsc + vite). Lint: `npm run lint`.

### Testando o build (`npm run preview`)

```powershell
npm run build
npm run preview
```

Duas diferenças em relação ao `dev`, e as duas importam:

- **A porta está fixada em 5173** no `vite.config.ts`. O padrão do preview seria 4173, mas o
  backend libera só a 5173 no CORS — na 4173 o preflight leva 403 e **toda** chamada à API
  falha com "não foi possível conectar ao servidor". Erro de porta ocupada = o `npm run dev`
  rodando em outro terminal.
- **Só o build tem a CSP.** Em dev ela não existe de propósito (script inline e HMR seriam
  bloqueados). Ou seja, **`npm run dev` não serve para testar a CSP**. Se algo quebrar só no
  preview, abra o console (F12) e procure `Refused to ...`: a linha nomeia a diretiva que
  faltou, e o conserto é acrescentar a origem em `politicaDeSeguranca`, no `vite.config.ts`.

---

## 4. Fluxo para testar

1. Se for a primeira vez nesta máquina, faça o passo 0 e **reabra o terminal**.
2. Suba os três nesta ordem: Postgres → backend → frontend.
3. Abra `http://localhost:5173`, vá em **Registrar**, crie um usuário e faça login.
4. Da Home dá para lançar renda/despesa/categoria (fixa ou variável — as fixas recorrem
   sozinhas todo mês), definir limites, criar objetivos, lançar investimentos CDB, importar a
   fatura do Nubank e ver os gráficos.

---

## 5. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| App não sobe, erro de placeholder | Variável de ambiente criada, mas terminal/IDE não foi reaberto |
| `CommandNotFoundException` no `mvnw` | Use `.\mvnw.cmd` — o `mvnw` sem extensão é script shell |
| `JAVA_HOME not found` | Aponte para a **raiz** do JDK, não para o `bin` |
| Telas vazias ou erro após limpar o banco | JWT antigo no navegador aponta para um usuário que não existe mais — deslogue |
| Testes de persistência falham no start | Docker Desktop não está rodando |
| Toda chamada à API falha no preview | Preview em porta diferente de 5173 (CORS) |
| App recusa subir após mudar entidade | Falta a migração Flyway correspondente — é proposital |

Para inspecionar o banco direto:

```powershell
docker exec financas-postgres psql -U postgres -d financas_db -c "select count(*) from despesa;"
```

---

# Deploy (Netlify + Render + Supabase)

Três serviços, **um repositório**. Não é preciso separar front e back em
repositórios diferentes: o Netlify entra na pasta `frontend/` (campo *base
directory*, já no `netlify.toml`) e o Render usa o `Dockerfile` da raiz.

| Peça | Onde | Arquivo que descreve |
|---|---|---|
| Front (estático) | Netlify | `netlify.toml` |
| API (Spring Boot) | Render | `Dockerfile` + `render.yaml` |
| Banco (Postgres) | Supabase | — (provisionado pelo painel) |

**O Netlify não roda o backend.** Ele serve arquivos estáticos e serverless
functions, não uma JVM de longa duração — por isso a API vai para o Render.

## Ordem (importa)

Banco → API → front. Cada um precisa do endereço do anterior.

### 1. Supabase

Crie o projeto e pegue a string de conexão. Dois cuidados:

- **Use o formato JDBC** (`jdbc:postgresql://host:porta/postgres`), não a URI
  `postgresql://usuario:senha@host/base` que o painel mostra primeiro — aquela é
  a forma que o `libpq` entende, e o driver JDBC recusa.
- **SSL é obrigatório**: acrescente `?sslmode=require` no fim.

Se a conexão direta não funcionar a partir do Render, use a string do **pooler**
(Supavisor) em *session mode*. O *transaction mode* quebra os prepared statements
do JDBC — se for o único caminho, acrescente também `&prepareThreshold=0`.

O Flyway aplica `V1`, `V2` e `V3` sozinho no primeiro start da API. Não rode
migração na mão.

### 2. Render

*New > Blueprint*, apontando para o repositório: o `render.yaml` cria o serviço.
Ele pedirá as variáveis marcadas com `sync: false`, que nunca ficam no git:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a string JDBC do Supabase |
| `DATABASE_USER` | o usuário do Supabase (normalmente `postgres`) |
| `POSTGRES_PASSWORD` | a senha do Supabase |
| `JWT_SECRET` | **uma chave nova**, não a da sua máquina |
| `CORS_ORIGINS` | a URL do Netlify (preencha depois do passo 3) |

Gere a chave nova com o mesmo comando do passo 0 deste guia. Reaproveitar o
segredo local em produção significa que um vazamento em qualquer um dos dois
compromete os dois.

O plano gratuito **hiberna** após ~15 min sem tráfego: a primeira visita depois
disso leva ~30s. Não é bug.

### 3. Netlify

*Add new site > Import from Git*. O `netlify.toml` já traz build, pasta de
publicação e o redirect de SPA. Defina no painel:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://<sua-api>.onrender.com/api` — **com o `/api` no fim** |

### 4. Feche o círculo

Volte ao Render e preencha `CORS_ORIGINS` com a URL do Netlify: **origem exata**,
com `https` e **sem barra no fim**. O navegador compara string, não "site
parecido". Depois, redeploy da API.

## Três armadilhas desta stack

**Variável do Vite é lida em tempo de BUILD.** O valor é gravado dentro do
bundle. Mudar `VITE_API_URL` no painel não tem efeito nenhum até um novo deploy
(*Clear cache and deploy site*) — diferente do backend, onde reiniciar basta.

**A CSP acompanha a `VITE_API_URL` automaticamente** (`vite.config.ts` deriva a
origem dela). Se as chamadas falharem só em produção, abra o console: uma linha
`Refused to connect` significa que a política e o endereço real discordam — quase
sempre porque o build foi feito antes de a variável existir.

**O health check precisa continuar público.** O Render chama `/api/health` sem
credencial e lê 401 como "fora do ar", o que põe o serviço em ciclo de
reinicialização. `HealthControllerTest` existe para essa linha do `SecurityConfig`
não cair sem ninguém perceber.

## O que muda em relação ao local

O Postgres local só escuta em `127.0.0.1` — no Supabase essa proteção deixa de
existir por natureza, e a senha passa a ser a única barreira. Use uma senha forte
e específica, nunca a mesma da sua máquina.
