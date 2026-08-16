# Como rodar o projeto (dev)

Guia rápido para subir o projeto localmente do zero. São 3 peças: **Postgres**
(Docker), **backend** (Spring Boot) e **frontend** (Vite/React).

## Pré-requisitos

- **Java 21** (JDK) — nesta máquina o `JAVA_HOME` não está setado globalmente, então
  é preciso apontá-lo em cada terminal (ver abaixo).
- **Node.js** (18+ recomendado) e **npm**.
- **Docker Desktop** (para o Postgres).

## 0. Segredos (uma vez só, por máquina)

Nenhuma senha mora no repositório. São **dois segredos**, em dois lugares:

| Segredo | Onde mora | Quem lê |
|---|---|---|
| `POSTGRES_PASSWORD` | arquivo `.env` na raiz **e** variável de ambiente do usuário | `.env` → docker-compose · variável → Spring |
| `JWT_SECRET` | variável de ambiente do usuário | Spring |

O `.env` não é versionado; copie o `.env.example` e preencha. Para gerar a chave do JWT
(512 bits, o que o HS512 exige):

```powershell
python -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(64)).decode())"
```

Para definir as variáveis (uma vez, permanente):

```powershell
[Environment]::SetEnvironmentVariable('JWT_SECRET','<a chave gerada>','User')
[Environment]::SetEnvironmentVariable('POSTGRES_PASSWORD','<a mesma senha do .env>','User')
```

> **Depois de criar as variáveis, feche e reabra o terminal (e a IDE).** Um processo só
> enxerga variável que já existia quando ele foi iniciado — terminal velho não vê a
> variável nova, e o sintoma engana: o app falha no start por placeholder não resolvido.
>
> Falhar no start é **proposital**: melhor não subir do que subir com um segredo conhecido.

## 1. Banco de dados (Postgres via Docker)

Na raiz do projeto:

```powershell
docker-compose up -d
```

Sobe o container `financas-postgres` (imagem `postgres:16`), banco `financas_db`,
usuário `postgres` e a senha do `.env`, exposto na porta **5433** do host (a 5432 já
costuma estar ocupada por outros projetos). Os dados persistem no volume
`financas-postgres-data`.

A porta é publicada em `127.0.0.1:5433`, só loopback: com `5433:5432` o Docker publicaria
em `0.0.0.0` e qualquer máquina da rede falaria direto com o banco, contornando a API e o JWT.

> **Trocar `POSTGRES_PASSWORD` não muda a senha de um volume que já existe** — o Postgres
> só lê essa variável na primeira inicialização. Num banco já criado, a troca é com
> `ALTER USER` no banco em execução.

Para desligar: `docker-compose down` (mantém os dados) — ou `docker-compose down -v`
para apagar o volume também.

## 2. Backend (Spring Boot)

Na raiz do projeto, no **PowerShell**:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd spring-boot:run
```

- Sobe em `http://localhost:8080`, com as rotas sob `/api`.
- O schema é criado/atualizado automaticamente (`spring.jpa.hibernate.ddl-auto=update`).
- CORS já liberado para o frontend em `http://localhost:5173`.

Para rodar os testes (não precisa do Postgres de pé):

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd -q test
```

## 3. Frontend (Vite + React)

Na pasta `frontend/`:

```powershell
cd frontend
npm install   # só na primeira vez (ou quando o package.json mudar)
npm run dev
```

- Sobe em `http://localhost:5173`.
- Fala com o backend em `http://localhost:8080/api` (configurado em `src/api/client.ts`).

Build de produção (checagem de tipos + bundle): `npm run build`. Lint: `npm run lint`.

### Testando o build de produção (`npm run preview`)

```powershell
npm run build
npm run preview
```

Duas diferenças em relação ao `npm run dev`, e as duas importam:

- **A porta está fixada em 5173** no `vite.config.ts`. O padrão do preview seria a 4173, mas
  o backend libera no CORS só a 5173 (`app.cors.allowed-origins`) — na 4173 o preflight leva
  403 e **toda** chamada à API falha com "não foi possível conectar ao servidor". Se der erro
  de porta ocupada, é o `npm run dev` rodando em outro terminal.
- **Só o build tem a CSP** (`Content-Security-Policy`), injetada pelo plugin `cspNoBuild()`.
  Em `dev` ela não existe de propósito: o dev server usa script inline e HMR, que a política
  bloquearia. Ou seja, **`npm run dev` não serve para testar a CSP** — tem que ser o preview.

Se alguma parte da tela quebrar no preview e não no dev, abra o console (`F12`) e procure uma
linha `Refused to ...`: ela nomeia a diretiva que faltou, e o conserto é acrescentar a origem
em `politicaDeSeguranca`, no `vite.config.ts`.

## Fluxo para testar

0. Se for a primeira vez nesta máquina, faça o passo 0 (segredos) e **reabra o terminal**.
1. Suba os 3 (Postgres → backend → frontend), nessa ordem.
2. Abra `http://localhost:5173`, vá em **Registrar**, crie um usuário e faça **login**.
3. A partir da Home dá para lançar renda/despesa/categoria (fixa ou variável — as
   fixas recorrem sozinhas todo mês), definir limites, criar objetivos (com ou sem
   vínculo a um investimento CDB), lançar investimentos CDB e ver os relatórios.
