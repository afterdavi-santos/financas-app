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

Funcionalidades que entram na primeira versão utilizável (status em 2026-08-04 —
backend + frontend React consumindo a API, ver `docs/progress/`):

- [x] **Login/sessão** por usuário (autenticação JWT, janela deslizante —
      renova a cada uso, desconecta só após 24h de inatividade; teto máximo
      de 7 dias mesmo com uso contínuo), com dados
      isolados por usuário.
- [x] **Categorias personalizáveis** — criar/editar/excluir (com exclusão em
      cascata opcional quando a categoria está em uso). **Toda categoria é fixa
      ou variável** (`tipo`), e toda despesa lançada nela herda esse tipo. Em
      todo lugar onde se escolhe/cria uma categoria, o seletor mostra as 4 mais
      usadas + "Nova categoria" de cara (resto por rolagem, com busca por
      texto) e avisa (sem bloquear) se o nome digitado for parecido com uma
      categoria já existente (busca por similaridade, `pg_trgm`).
- [x] **Registro de despesas** — fixas ou variáveis conforme a categoria.
      **Despesas em categoria fixa recorrem sozinhas todo mês** (mesmo valor, até
      serem editadas ou excluídas); excluir a ocorrência atual só afeta o mês
      atual em diante — meses passados ficam intactos nos relatórios.
- [x] **Registro de renda** — por mês de referência, com `tipo`
      (FIXA/FREELA/RETORNO_INVESTIMENTOS); múltiplas rendas no mesmo mês
      permitidas. **Renda fixa recorre sozinha todo mês**, mesma lógica das
      despesas fixas.
- [x] **Cálculo de quanto foi guardado/economizado no mês** (renda - despesas).
- [x] **Metas/limite de orçamento por categoria**, com alertas: aviso ao lançar uma
      despesa que estoura o teto, "simular despesa" e status (barra + "estourou") na
      tela de Limites. **Limite é fixo por categoria** (não por mês — ver seção 8).
- [x] **Gráficos**:
  - Tela de Despesas: fixo × variável, top categorias, comparação com o mês
    anterior (maior alta/baixa). "Maior alta" ignora categorias criadas no mês
    atual e categorias sem nenhum gasto no mês anterior (não é uma alta real
    comparar com zero); "maior baixa" só considera categorias que já tiveram
    algum gasto no mês atual (categoria zerada só porque o mês mal começou
    não é uma queda de verdade ainda).
  - Relatórios: comparativo mês a mês (renda, despesas e economia).
- [x] **Objetivos de economia** (extra ao escopo original): meta com termômetro de
      progresso, cálculo dinâmico do aporte mensal necessário (% da renda fixa) e
      timeline de aportes (criar/editar/remover cada um individualmente).
- [x] **Investimento CDB** (extra ao escopo original): rendimento calculado a
      partir do CDI real (Banco Central), aportes adicionais sem apagar o
      rendimento já acumulado, resgate parcial/total com cálculo de IOF/IR
      regressivos. Pode ser **vinculado a um Objetivo** (criação/edição do
      investimento já oferece vincular a uma meta existente ou criar uma nova ali
      mesmo) — o progresso da meta passa a ser a posição ao vivo do investimento.

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
- **Categoria**: pertence a um usuário, nome, tipo (fixa/variável — toda despesa lançada na categoria herda esse tipo).
- **Registro/Lançamento** (`Despesa`): valor, data, categoria (que define se é fixa/variável), descrição, usuário. Se a categoria é fixa, a despesa nasce ligada a uma `RecorrenciaDespesa` própria (série independente) que gera automaticamente uma linha por mês até ser editada/excluída.
- **RendaMensal** (`Renda`): valor, mês de referência, usuário, tipo (fixa/freela/retorno). Renda fixa segue o mesmo mecanismo de recorrência (`RecorrenciaRenda`).
- **MetaOrcamento** (`LimiteCategoria`): categoria, valor limite, usuário. **Limite
  fixo por categoria** (um por categoria, sem mês); o gasto é avaliado sempre no mês
  corrente contra esse teto.
- **Objetivo**: descrição, incentivo (opcional), valor-alvo, valor-atual, data-alvo, usuário. Pode estar vinculado a um `InvestimentoCdb` (no máximo um por vez); nesse caso `valor-atual` passa a ser a posição ao vivo do investimento em vez do saldo de aportes manuais.
- **InvestimentoCdb**: descrição, % do CDI, usuário; container de `AporteCdb` (lotes, cada um com seu próprio relógio de rendimento). `CdiDiario` guarda o cache local da taxa CDI diária (Banco Central) usado no cálculo.

## 9. Fora de Escopo (explicitamente, por ora)

- Integração com Open Finance / bancos reais (Pluggy, Belvo etc.).
- Modelo multi-tenant tipo SaaS de verdade (cobrança, planos, onboarding de clientes externos).
- Compartilhamento de dados entre usuários (visão familiar conjunta).

## 10. Perguntas em Aberto

- PostgreSQL ou MySQL? **PostgreSQL** (definido).
- Formato dos alertas de orçamento: **in-app** (definido) — aviso ao lançar despesa
  que estoura, simulador de despesa e status na tela de Limites. E-mail fica no backlog.
- Estrutura de autenticação: **JWT via Spring Security** (implementado).
