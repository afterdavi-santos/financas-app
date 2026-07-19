# Escopo do Projeto — Sistema de Gestão de Finanças Pessoais

> Documento vivo. Atualizar conforme o projeto evolui e novas decisões forem tomadas.

## 1. Visão Geral

Sistema web para controle de finanças pessoais, criado para resolver uma dor real do
próprio autor (usuário 1). Substitui uma planilha Excel onde os registros ficavam
genéricos demais (só o valor, sem contexto), dificultando entender depois o que
realmente foi gasto.

## 2. Problema / Dor Principal

- Registros pouco detalhados: só o valor é anotado, o "porquê" do gasto se perde com o tempo.
- Falta de categorização e de visão clara de quanto sobrou/guardou no mês.
- Falta de tratamento para renda variável (nem todo mês o salário é o mesmo).

## 3. Público-alvo

- **Agora**: uso individual (o autor).
- **Futuro próximo**: irmão e cunhada (ele é bancário — provavelmente vai querer
  bastante detalhamento/relatórios). Não é um SaaS multi-tenant complexo — cada
  pessoa terá sua própria conta com dados totalmente isolados (ver seção 6).

## 4. Escopo do MVP

Funcionalidades que entram na primeira versão utilizável:

- [ ] **Login/sessão** por usuário (autenticação), preparando terreno para múltiplos
      usuários futuramente, cada um com seus dados isolados.
- [ ] **Registro de despesas fixas** (ex: aluguel, internet, assinaturas).
- [ ] **Registro de despesas extraordinárias** (gastos pontuais/variáveis do mês).
- [ ] **Categorias personalizáveis** — usuário cria/edita categorias (mercado,
      transporte, lazer...) para nunca mais esquecer o que foi o gasto.
- [ ] **Registro de renda variável** — opção de lançar um valor de salário/entrada
      diferente a cada mês (em vez de assumir um valor fixo recorrente).
- [ ] **Cálculo de quanto foi guardado/economizado no mês** (receita - despesas).
- [ ] **Metas/limite de orçamento por categoria**, com algum tipo de alerta ao se
      aproximar ou ultrapassar o limite definido.
- [ ] **Gráficos**:
  - Visão do mês atual (gastos por categoria, fixo x extraordinário).
  - Comparativo mês a mês / ano a ano (evolução de gastos e economia ao longo do tempo).

## 5. Backlog / Futuro (fora do MVP)

- Leitor automático de fatura em PDF: criar regras de negócio para interpretar
  padrões de PDFs dos bancos mais usados pela família e lançar despesas automaticamente.
- Deploy em nuvem (ex: Render, Railway, Fly.io) para acesso remoto do irmão/cunhada.
- Reavaliar modelo de isolamento de dados caso surja necessidade de visão
  compartilhada entre usuários (ex: "grupo familiar").
- Anexo de comprovante/nota fiscal no registro (avaliado, mas não priorizado —
  a expectativa é que categorias bem definidas já resolvam a dor principal).

## 6. Decisões de Arquitetura

| Decisão | Escolha | Observação |
|---|---|---|
| Isolamento de dados | Totalmente isolado por usuário | Cada pessoa só vê seus próprios registros. Simplifica o modelo: basta relacionar tudo a um `usuario_id`. Sem necessidade de lógica multi-tenant complexa por enquanto. |
| Hospedagem (curto prazo) | Localhost | Roda na própria máquina enquanto o uso é individual. Deploy em nuvem fica pro backlog. |
| Frontend | React (SPA) | Decisão consciente de ir por algo mais robusto mesmo sendo o ponto mais fraco do autor — visando aprendizado e valor de portfólio. Vai exigir mais explicações passo a passo durante o desenvolvimento. |
| Banco de dados (dev) | PostgreSQL via Docker, local | Container Docker rodando na máquina do autor durante o desenvolvimento, porta host 5433 (5432 já ocupada por outros projetos locais). Sem dependência de internet pra rodar a aplicação no dia a dia. |
| Banco de dados (produção) | Supabase (Postgres gerenciado) | Usado só como banco hospedado (JDBC/Postgres puro) — não usaremos Auth/Storage/API do Supabase, já que Spring Security e Spring Web já cobrem essas necessidades. Migração feita só quando o projeto for pra nuvem, evitando auth duplicado. |

## 7. Stack Tecnológica

- **Backend**: Java + Spring Boot (Spring Web, Spring Data JPA, Spring Security para autenticação).
- **Frontend**: React, consumindo o backend via API REST (backend e frontend desacoplados).
- **Banco de dados**: Relacional (SQL). PostgreSQL

## 8. Modelo de Dados (alto nível, não exaustivo)

Rascunho inicial de entidades — será refinado quando começarmos a modelagem:

- **Usuario**: dados de login/autenticação.
- **Categoria**: pertence a um usuário, nome, tipo (fixa/extraordinária como sugestão de default, mas personalizável).
- **Registro/Lançamento**: valor, data, categoria, tipo (fixa/extraordinária), descrição, usuário.
- **RendaMensal**: valor de entrada/salário daquele mês, usuário.
- **MetaOrcamento**: categoria, valor limite, mês/período, usuário.

## 9. Fora de Escopo (explicitamente, por ora)

- Integração com Open Finance / bancos reais (Pluggy, Belvo etc.).
- Modelo multi-tenant tipo SaaS de verdade (cobrança, planos, onboarding de clientes externos).
- Compartilhamento de dados entre usuários (visão familiar conjunta).

## 10. Perguntas em Aberto

- PostgreSQL ou MySQL? Postgre
- Formato exato dos alertas de orçamento (in-app? e-mail?) — definir quando chegarmos nessa funcionalidade.
- Estrutura de autenticação: JWT via Spring Security é o caminho mais comum — validar quando chegarmos na implementação do login.
