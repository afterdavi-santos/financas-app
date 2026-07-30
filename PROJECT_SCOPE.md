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

Funcionalidades que entram na primeira versão utilizável (status em 2026-07-24 —
backend + frontend React consumindo a API, ver `docs/progress/`):

- [x] **Login/sessão** por usuário (autenticação JWT), com dados isolados por usuário.
- [x] **Registro de despesas fixas** (ex: aluguel, internet, assinaturas).
- [x] **Registro de despesas extraordinárias** (gastos pontuais/variáveis do mês).
- [x] **Categorias personalizáveis** — criar/excluir categorias (edição de nome
      ainda não implementada).
- [x] **Registro de renda variável** — renda por mês de referência, com `tipo`
      (FIXA/FREELA/RETORNO_INVESTIMENTOS); múltiplas rendas no mesmo mês permitidas.
- [x] **Cálculo de quanto foi guardado/economizado no mês** (renda - despesas).
- [x] **Metas/limite de orçamento por categoria**, com alertas: aviso ao lançar uma
      despesa que estoura o teto, "simular despesa" e status (barra + "estourou") na
      tela de Limites. **Limite é fixo por categoria** (não por mês — ver seção 8).
- [x] **Gráficos**:
  - Tela de Despesas: fixo × extraordinário, top categorias, comparação com o mês
    anterior (maior alta/baixa).
  - Relatórios: comparativo mês a mês / ano a ano (renda, despesas e economia).
- [x] **Objetivos de economia** (extra ao escopo original): meta com termômetro de
      progresso e cálculo dinâmico do aporte mensal necessário (% da renda fixa).

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
- **RendaMensal**: valor de entrada/salário daquele mês, usuário, tipo (fixa/freela/retorno).
- **MetaOrcamento** (`LimiteCategoria`): categoria, valor limite, usuário. **Limite
  fixo por categoria** (um por categoria, sem mês); o gasto é avaliado sempre no mês
  corrente contra esse teto.
- **Objetivo**: descrição, valor-alvo, valor-atual, data-alvo, usuário.

## 9. Fora de Escopo (explicitamente, por ora)

- Integração com Open Finance / bancos reais (Pluggy, Belvo etc.).
- Modelo multi-tenant tipo SaaS de verdade (cobrança, planos, onboarding de clientes externos).
- Compartilhamento de dados entre usuários (visão familiar conjunta).

## 10. Perguntas em Aberto

- PostgreSQL ou MySQL? **PostgreSQL** (definido).
- Formato dos alertas de orçamento: **in-app** (definido) — aviso ao lançar despesa
  que estoura, simulador de despesa e status na tela de Limites. E-mail fica no backlog.
- Estrutura de autenticação: **JWT via Spring Security** (implementado).
