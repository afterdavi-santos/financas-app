# Como rodar o projeto (dev)

Guia rápido para subir o projeto localmente do zero. São 3 peças: **Postgres**
(Docker), **backend** (Spring Boot) e **frontend** (Vite/React).

## Pré-requisitos

- **Java 21** (JDK) — nesta máquina o `JAVA_HOME` não está setado globalmente, então
  é preciso apontá-lo em cada terminal (ver abaixo).
- **Node.js** (18+ recomendado) e **npm**.
- **Docker Desktop** (para o Postgres).

## 1. Banco de dados (Postgres via Docker)

Na raiz do projeto:

```powershell
docker-compose up -d
```

Sobe o container `financas-postgres` (imagem `postgres:16`), banco `financas_db`
(user/senha `postgres`/`postgres`), exposto na porta **5433** do host (a 5432 já
costuma estar ocupada por outros projetos). Os dados persistem no volume
`financas-postgres-data`.

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

## Fluxo para testar

1. Suba os 3 (Postgres → backend → frontend), nessa ordem.
2. Abra `http://localhost:5173`, vá em **Registrar**, crie um usuário e faça **login**.
3. A partir da Home dá para lançar renda/despesa/categoria (fixa ou variável — as
   fixas recorrem sozinhas todo mês), definir limites, criar objetivos (com ou sem
   vínculo a um investimento CDB), lançar investimentos CDB e ver os relatórios.
