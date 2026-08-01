# Layout atual — Tela Home e Menu

> Documento de referência para discutir melhorias de design. Descreve **como está hoje**, não como deveria ficar. Sempre que pedir uma mudança de visual, você pode apontar para uma seção específica deste arquivo (ex: "quero mudar o card de Renda do mês" ou "o menu lateral deveria virar um menu superior").

## 0. Identidade visual (brandbook)

O app já passou por uma repaginação baseada num brandbook próprio. A identidade vem de lá:

- **Paleta base:** 5 tons de azul + preto e branco.
  | Token Tailwind | Hex | Uso |
  |---|---|---|
  | `grouper-sky` | `#86C3EB` | realces, bordas sutis, tags claras, 1º degrau (mais claro) da escala de progresso |
  | `grouper-mid` | `#5399CD` | ação principal, item ativo do menu, 2º degrau da escala de progresso |
  | `grouper-deep` | `#244C7E` | acento profundo — investimentos (CDB), links secundários, 3º degrau da escala de progresso |
  | `grouper-navy` | `#1C4562` | texto secundário sobre fundo claro, 4º degrau da escala de progresso |
  | `grouper-ink` | `#102241` | texto principal, fundo do menu lateral, 5º degrau (mais escuro) da escala de progresso |
  | `grouper-mist` | `#EEF5FB` | tinta quase branca (derivada do sky) — fundo da página |
  | preto `#000000` / branco `#FFFFFF` | — | reservados para alarme real (avisos, banners de erro) e superfícies claras |

- **Paleta de sinalização financeira (verde/vermelho):** o brandbook original não tinha
  verde/vermelho, mas o app passou a usar dois tons de acento fixos para "positivo"
  (renda, economia) e "negativo" (despesa):
  | Token Tailwind | Hex | Uso |
  |---|---|---|
  | `grouper-green` | `#005E2F` | borda de "Renda do mês" (`StatCard` positivo) |
  | `grouper-red` | `#BA0000` | borda de "Despesas do mês" (`StatCard` negativo) |

  Essas duas cores (e as escalas de degraus abaixo) vêm de duas paletas de referência
  em `frontend/public/brand/palettes/` — uma vermelho→amarelo e outra verde→amarelo,
  7 tons cada. `utils/cores.ts` reaproveita tons específicos dessas paletas em três
  escalas por degraus (não é degradê contínuo):
  - `corEscalaDificuldade()` — botão "Plano de contenção" (seção 4.5.4): 4 degraus
    verde/amarelo/laranja/vermelho por urgência.
  - `corEscalaEconomia()` — borda do card "Economia do mês" (seção 4.5.1): 5 degraus
    de 20% (2 vermelhos, 1 amarelo, 2 verdes) por quão perto de zero a economia está
    em relação à renda do mês.
  - `corEscalaProgresso()` — barra de progresso dos Objetivos (seção 4.4.2): 5 degraus
    de 20%, usando os 5 tons de azul da paleta base (claro → escuro), não
    verde/vermelho.

- **Tipografia:**
  - **Khand** (condensada) — títulos, números grandes dos cards, rótulos e botões (estes últimos em caixa alta com tracking, ecoando o specimen do brandbook). Nem todo botão usa esse tratamento — ver seção 5.
  - **Hind** — texto corrido, descrições, itens de lista, e o valor atual de cada investimento CDB (ver 4.5.3).
  - Ambas importadas via Google Fonts em `frontend/index.html`.

- **Logomarca:** SVGs reais da marca em `frontend/public/brand/` — `logomarca-branca.svg` (usada sobre fundo escuro) e `logomarca-preta.svg` (para uso futuro sobre fundo claro).

- **Tokens Tailwind** definidos em `frontend/src/index.css` via `@theme` (cores `grouper-*` e fontes `font-display`/`font-body`).

## 1. Stack técnica

- **Framework:** React 19 + Vite + TypeScript
- **Estilo:** Tailwind CSS v4 (tokens customizados via `@theme` — ver seção 0 — sem biblioteca de componentes tipo MUI/Chakra)
- **Roteamento:** react-router-dom
- **Gráficos:** Recharts (usado só na página de Relatórios — a Home hoje não tem nenhum gráfico fora do card "Economia nos últimos meses")

Arquivos principais:
| Arquivo | O que é |
|---|---|
| `frontend/src/index.css` | Tokens de cor (`grouper-*`, incluindo `grouper-green`/`grouper-red`) e fonte (`font-display`/`font-body`) |
| `frontend/public/brand/` | SVGs da logomarca (branca e preta) e `brandbook.pptx` (fonte oficial dos 5 tons de azul) |
| `frontend/public/brand/palettes/` | Duas paletas de referência (imagens) vermelho→amarelo e verde→amarelo, 7 tons cada — fonte das cores usadas em `utils/cores.ts` |
| `frontend/src/components/Layout.tsx` | Casca da aplicação (menu + área de conteúdo) |
| `frontend/src/components/Sidebar.tsx` | Menu lateral |
| `frontend/src/pages/HomePage.tsx` | Tela Home |
| `frontend/src/components/StatCard.tsx` | Card de estatística compartilhado — usado em Despesas **e** na Home (Renda do mês / Despesas do mês) |
| `frontend/src/components/EconomiaDestaque.tsx` | Card grande da Economia do mês na Home (valor + variação % vs mês anterior + borda de cor variável — ver 4.5.1) |
| `frontend/src/components/GraficoEconomiaHome.tsx` | Gráfico de barras (Recharts) da economia dos últimos 6 meses, na Home |
| `frontend/src/components/ObjetivosResumoHome.tsx` | Lista condensada de objetivos da Home, com barra de progresso (escala de azul), rolagem (>2 itens), fixar (pin) até 2 objetivos, data da meta e botão "+ Adicionar objetivo" |
| `frontend/src/components/IconesInvestimento.tsx` | Ícones SVG (editar/excluir) usados nas ações do card de Investimento CDB da Home |
| `frontend/src/components/Modal.tsx` | Modal genérico reaproveitável (título Khand + `grouper-ink` + conteúdo + fechar por X/backdrop/Esc) — usado por todos os popups de formulário e pelo pop-up de Plano de contenção |
| `frontend/src/utils/cores.ts` | `corEscalaDificuldade()`, `corEscalaEconomia()` e `corEscalaProgresso()` — as três escalas de cor por degraus da Home (ver seção 0) |
| `frontend/src/utils/contencaoRendaVariavel.ts` | `planoContencao()` (cálculo do plano) + `dificuldadeContencao()` (0 a 1, usada por `corEscalaDificuldade`) |
| `frontend/src/components/PageHeader.tsx` | Cabeçalho padrão de outras páginas (Home tem o seu próprio, inline) |
| `frontend/src/components/SimularDespesaModal.tsx` | **Órfão no momento** — não é mais chamado por nenhuma página (o botão "Simular despesa" foi removido da Home); o componente continua no repo mas sem callers |

## 2. Estrutura geral da tela

```
┌──────────────┬─────────────────────────────────────┐
│              │                                     │
│   Sidebar    │           Conteúdo (Home)            │
│   (240px)    │     fundo mist (quase branco,         │
│   fundo      │       tingido de azul)                │
│   ink        │     ocupa toda a largura              │
│  (navy       │       restante (full-width)           │
│  escuro)     │                                       │
└──────────────┴─────────────────────────────────────┘
```

- Layout em flex: sidebar fixa à esquerda + área principal ocupando o resto.
- Fundo da página: `grouper-mist` (quase branco, com leve tingimento azul).
- **A sidebar não é responsiva**: não colapsa, não vira menu hambúrguer, não some no celular. Está sempre visível e ocupa sempre 240px.
- **A Home é full-width** (`w-full`, sem `mx-auto`/`max-w`) — as outras páginas
  (Despesas, Categorias, Rendas, Objetivos, Limites, Relatórios) ainda usam o
  wrapper antigo `mx-auto max-w-4xl` centralizado; só a Home foi convertida para
  o layout em grid de 2 colunas descrito na seção 4.

## 3. Menu lateral (Sidebar)

Tipo: barra vertical fixa à esquerda, fundo `grouper-ink` (navy bem escuro), texto claro. Não é colapsável.

De cima para baixo:

1. **Bloco de marca** — logomarca branca (`logomarca-branca.svg`), `h-16`, sozinha (sem texto ao lado), com uma linha separadora abaixo.
2. **Lista de navegação**, nesta ordem:
   1. Início
   2. Despesas
   3. Categorias
   4. Rendas
   5. Objetivos
   6. Limites
   7. Relatórios
   - Item ativo (página atual): fundo `grouper-mid` (azul médio), texto branco.
   - Itens inativos: texto branco 70% opaco, fica branco sólido com fundo branco 10% ao passar o mouse.
   - (O código já tem suporte para itens desabilitados/"em breve", mas hoje todos estão ativos.)
3. **Rodapé** — separado por uma linha, com o botão "Sair" ocupando a largura toda.

## 4. Tela Home — layout full-width em 2 colunas

A partir da repaginação inspirada num dashboard de referência ("Capital Flow"), a
Home deixou de ser uma coluna central limitada (`max-w-4xl`) e passou a ocupar a
largura toda do conteúdo (`w-full`, sem `mx-auto`/`max-w`). Abaixo do cabeçalho e
dos banners, o corpo principal é um grid de 2 colunas (`lg:grid-cols-3`, coluna
esquerda com `lg:col-span-2` — proporção ~2:1), que empilha em 1 coluna só em
telas estreitas (`grid-cols-1` abaixo do breakpoint `lg`).

### 4.1 Cabeçalho
- Não é mais um `flex` simples: é um `grid grid-cols-1 lg:grid-cols-3` — o **mesmo
  template de colunas do corpo da página** (seção 4 intro) — pra alinhar
  visualmente com o grid de baixo.
  - Título "Início" (fonte Khand) ocupa `lg:col-span-2` (alinhado com a coluna
    esquerda).
  - O bloco de ações ocupa a 3ª coluna (`lg:col-span-1`, implícito), então os
    **botões começam exatamente onde o card "Economia do mês" começa** logo
    abaixo, e o avatar (ver abaixo) fica na borda direita da página.
- **Seletor de mês + 2 botões de ação**, nesta ordem:
  1. **Seletor de mês** (`<input type="month">`, "cara de botão" — borda
     dupla `grouper-mid`, fundo branco, Khand `font-semibold`, sombra leve,
     hover `grouper-mist`, `onClick` chama `showPicker()` pra abrir o
     seletor clicando em qualquer parte do campo, não só no ícone do
     calendário — mesmo tratamento usado em Despesas/Rendas, ver
     `movimentacoes-layout-atual.md`). Define o **mês em foco** (estado
     `mes`, padrão o mês atual): todos os cards, a lista e o gráfico da Home
     mostram dados desse mês, não necessariamente "hoje". Largura fixa
     `w-36` (144px) — encaixado no espaço que já era reservado como padding
     vazio antes dos botões (`pl-44` virou `pl-6`: 24px + 144px do input +
     8px do `gap-2` = 176px, os mesmos 44×4px de antes), então "+ Adicionar
     renda" continua exatamente na mesma posição de antes.
  2. **+ Adicionar renda** (Khand, caixa alta, tracking, `font-semibold`,
     `grouper-mid` sólido)
  3. **+ Adicionar despesa** (idem, `grouper-ink` sólido)
- **Avatar placeholder**: círculo `grouper-ink` de 40px (`h-10 w-10`) no canto
  superior direito, vazio por enquanto — reservado para a futura foto de
  perfil do usuário.
- As caixinhas de **Renda do mês / Despesas do mês** viraram `StatCard`s no
  topo da coluna esquerda (ver 4.4.1) — mostram o mês em foco, não sempre o
  mês atual.

### 4.2 Banner de lembrete mensal *(aparece só uma vez por mês)*
- Faixa `grouper-mist` com borda `grouper-sky`/50: "O mês virou! Deseja redefinir seus limites de despesas?"
- Botões: "Sim, redefinir" (`grouper-mid` sólido, leva para Limites) / "Agora não" (texto `grouper-navy`, dispensa).
- Continua full-width, acima do grid de 2 colunas.

### 4.3 Banner de erro *(só se der erro ao carregar dados)*
- Faixa preta suave (`bg-black/5`, borda esquerda preta) com "⚠" + texto do erro em `grouper-ink`. Esse é o padrão de alerta reaproveitado nos formulários (ver 4.6).
- Continua full-width, acima do grid de 2 colunas.

### 4.4 Coluna esquerda (mais larga) — de cima para baixo

#### 4.4.1 Cards "Renda do mês" / "Despesas do mês" (`StatCard`)
- Topo da coluna esquerda: grid de 2 colunas com os `StatCard`s de Renda
  (borda `grouper-green`) e Despesas (borda `grouper-red`) — as duas únicas
  exceções de verde/vermelho fora das escalas por degraus (ver seção 0).
- Rótulo (`text-sm`, `grouper-ink`, maiúsculo, `font-semibold`) e valor
  (`text-3xl` Khand `font-bold`) — ambos em negrito.

#### 4.4.2 Seção "Objetivos" (`ObjetivosResumoHome`)
- Card branco. Cabeçalho com título "Objetivos" (`font-semibold`, negrito) **e**,
  à direita, o botão **"+ Adicionar objetivo"** (`grouper-deep`, texto normal —
  sem caixa alta/Khand/negrito, ao contrário dos botões do cabeçalho da Home;
  mesmo padrão visual do botão "+ Novo investimento" do card de CDB). Abre o
  `NovoObjetivoModal` (o mesmo componente usado na página Objetivos) e recarrega
  a lista da Home ao salvar.
- Se vazio: "Nenhum objetivo cadastrado."
- Lista condensada (sem os botões de gestão da página dedicada): por objetivo,
  descrição (texto normal, sem negrito) + percentual de progresso + **ícone de
  fixar (pin)** na mesma linha à direita, barra de progresso e, embaixo, uma
  linha com "R$X de R$Y" à esquerda e **"meta para DD/MM/AAAA"** (a `dataAlvo`
  do objetivo) à direita. Usa `planoObjetivo()` (`utils/objetivos.ts`) para o
  cálculo.
- **Cor da barra de progresso**: escala de azul por degraus de 20%
  (`corEscalaProgresso()`), do mais claro (`grouper-sky`, 0–20%) ao mais escuro
  (`grouper-ink`, 80–100%) — quanto maior o progresso, mais escura a barra.
- **Fixar (pin)**: clicar no ícone fixa o objetivo até 2 por vez (preenche de
  `grouper-mid`; tentar fixar um 3º não faz nada, só mostra tooltip
  explicando o limite). Objetivos fixados vão pro topo da lista. Preferência
  salva só no `localStorage` (`financas.objetivosFixadosHome`).
- **Rolagem**: com mais de 2 objetivos, a lista vira `max-h-64 overflow-y-auto`
  em vez de esticar o card.

#### 4.4.3 Seção "Últimas despesas"
- Card branco, título "Últimas despesas" (`font-semibold`, negrito).
- Se vazio: "Nenhuma despesa lançada neste mês ainda."
- Lista das **5** despesas mais recentes **do mês em foco** (ver 4.1, não
  necessariamente o mês atual): descrição (texto normal, sem negrito)
  + subtexto (categoria · tipo · data) à esquerda, valor em R$ à direita
  (também texto normal, sem negrito).

### 4.5 Coluna direita (mais estreita) — de cima para baixo

#### 4.5.1 "Economia do mês" em destaque (`EconomiaDestaque`)
- Card branco (`p-5`): rótulo pequeno em cima (Khand, `font-semibold`,
  maiúsculo), valor em Khand `font-bold` (`text-3xl`), cor `grouper-deep` se
  positiva/`grouper-ink` se negativa.
- **Borda esquerda de cor variável** (`corEscalaEconomia()`, aplicada via
  `style` inline pois é uma escala de 5 hex específicos, não classes Tailwind
  fixas): calcula `economia / renda * 100` (0–100, negativo vira 0) e escolhe
  1 de 5 degraus de 20% — vermelho (0–20%) → laranja/vermelho (20–40%) →
  amarelo (40–60%) → verde claro (60–80%) → verde escuro (80–100%). Quanto
  mais perto de zero a economia estiver em relação à renda, mais vermelha a
  borda; quanto maior a sobra, mais verde. O componente recebe `renda` como
  prop (além de `valor` e `variacaoPercentual`) só para esse cálculo.
- Abaixo do valor: variação percentual vs mês anterior (seta ↑/↓ + %), calculada
  a partir do histórico de `compararMeses` (últimos 6 meses). Some quando não há
  mês anterior para comparar.

#### 4.5.2 Gráfico "Economia nos últimos meses" (`GraficoEconomiaHome`)
- Cabeçalho do card tem o título "Economia nos últimos meses" (`font-semibold`,
  negrito) **e**, à direita, o botão de **Plano de contenção** (ver 4.5.4).
- Gráfico de barras (Recharts) só da série Economia dos últimos 6 meses — barra
  `grouper-mid` quando positiva, `grouper-ink` quando negativa. `h-36`.
- **Os 6 meses terminam no mês em foco** (não sempre hoje): mudou junto com
  a introdução do seletor de mês (ver 4.1) — antes era sempre "hoje - 5
  meses até hoje", agora é `primeiroDiaMesesAtrasDoMes(mes, 5)` até `mes`.
- **Não é clicável** — só o seletor de mês do cabeçalho (ver 4.1) troca o mês
  em foco. (Chegou a ser clicável — clicar numa coluna selecionava aquele
  mês —, mas foi revertido por decisão de produto; ver mesma decisão nos
  gráficos de Despesas/Rendas em `movimentacoes-layout-atual.md`.)
- Eixo Y mostra o valor **por extenso** (`R$ 1.500`, separador de milhar
  `pt-BR`), sem abreviar em "mil".
- Se não há histórico suficiente: "Sem histórico suficiente ainda."

#### 4.5.3 Seção "Investimento CDB"
- Card branco. Cabeçalho com título "Investimento CDB" (`font-semibold`,
  negrito) + botão "+ Novo investimento" (`grouper-deep`, texto normal — sem
  negrito) à direita.
- Se vazio: texto "Nenhum investimento CDB ativo."
- Se tem investimentos:
  - Barra de seleção múltipla e "Selecionar todos" só aparecem quando pelo
    menos 1 item está selecionado.
  - **Sem checkbox visível**: cada linha inteira é clicável — clicar
    seleciona/deseleciona o item e muda o fundo pra `bg-grouper-sky/30`; passar
    o mouse (sem clicar) dá um hover mais sutil, mas ainda visivelmente azul
    (`hover:bg-grouper-sky/20` — escurecido a partir do `grouper-mist/60`
    original, pra ficar mais claro que a linha é clicável). Mesmo padrão de
    hover reaproveitado no filtro Todas/Fixas/Variáveis da lista de despesas
    (ver `movimentacoes-layout-atual.md`).
  - Layout de cada item:
    - Nome (`text-base`, sem negrito) **e, na mesma linha, ao lado do nome**,
      o selo "X% do CDI" com **fundo azul claro** (`bg-grouper-sky/30`) — antes
      ficava embaixo do nome, com fundo branco.
    - Canto superior direito: data da aplicação + (se vinculado a um
      objetivo) só o ícone 🔗, com o nome do objetivo em tooltip (`title`).
    - Valor atual em destaque, cor `grouper-deep`, **fonte Hind**
      (`font-body`, sem negrito) — não usa mais Khand/`font-display` como o
      resto dos números grandes da Home.
    - Linha de ações **sempre visível**: "Investir mais" / "Resgatar" (botões
      com contorno `grouper-deep`), ícone de Editar (lápis, contorno
      `grouper-mid`) e ícone de Excluir (X, contorno vermelho). "Rendeu R$X"
      fica alinhado à direita nessa mesma linha.
  - **Rolagem**: com mais de 2 investimentos, a lista vira
    `max-h-72 overflow-y-auto`.

#### 4.5.4 Botão + pop-up "Plano de contenção"
- Botão (`Plano de contenção — {mês seguinte}`, sem aspas ao redor do mês, sem
  negrito) no cabeçalho do card "Economia nos últimos meses" (ver 4.5.2).
  Clicar abre o conteúdo num `Modal` genérico centralizado na tela.
  **"Mês seguinte" é relativo ao mês em foco** (`mesSeguinteYYYYMM(mes)`, ver
  4.1), não ao mês seguinte ao real — projeta a partir do mês que está sendo
  visto, não de hoje.
- **Cor do botão** (`utils/cores.ts`, `corEscalaDificuldade`): degraus
  verde → amarelo → laranja → vermelho, baseados em `dificuldadeContencao()`
  (`utils/contencaoRendaVariavel.ts`) — a fração das despesas extraordinárias
  selecionadas que precisa ser cortada pra fechar o mês seguinte:
  - até 40% → verde (`#005E2F`) | 40–70% → amarelo (`#ECA000`) | 70–90% →
    laranja (`#D96000`) | acima de 90% → vermelho (`#BA0000`, = exatamente o
    caso em que cortar tudo ainda não é suficiente).
  - Cores tiradas das paletas de referência em
    `frontend/public/brand/palettes/` (ver seção 0), não são mais tons
    genéricos do Tailwind (`bg-red-500` etc.).
  - Cor do texto do botão muda para garantir contraste (escuro no amarelo,
    branco nos demais).
- Conteúdo do modal (igual antes): texto explicativo + lista de categorias com
  sugestão de corte, ou faixa verde "✓" se a renda fixa já cobre tudo.

### 4.6 Modais

Abrem por cima da tela ao clicar nos botões de ação: Nova Despesa, Nova Renda,
Novo Investimento CDB, Novo Objetivo (ver 4.4.2), Resgatar CDB, Investir Mais,
e o pop-up de Plano de contenção.

- **Repaginados com a identidade da marca** (Khand/Hind + `grouper-*`): Nova
  Despesa, Nova Renda, Novo Investimento CDB, Novo Objetivo, e o próprio
  `Modal.tsx` genérico (chrome compartilhado por todos, incluindo o pop-up de
  Plano de contenção). Labels em `grouper-navy`, inputs com borda
  `grouper-sky/40` e foco `grouper-mid`, botão "Salvar" em `grouper-mid`
  Khand caixa alta, "Cancelar" em texto `grouper-navy`. Mensagens de erro
  usam o mesmo padrão de alerta preto do banner de erro da Home (seção 4.3);
  avisos de sucesso (ex.: "dentro do limite") usam o padrão
  `border-grouper-mid` + `bg-grouper-mist` do modal de Plano de contenção.
- **Ainda não repaginados** (continuam com o visual antigo azul/slate padrão
  do Tailwind): `ResgatarCdbModal`, `InvestirMaisModal`,
  `VincularInvestimentoModal` — fora do escopo até agora.

## 5. Padrões visuais observados

| Elemento | Padrão |
|---|---|
| Paleta | 5 tons de azul da marca (`grouper-sky` → `grouper-ink`) para hierarquia/estrutura + preto/branco para alarme real — ver seção 0. **Exceções deliberadas de verde/vermelho**: bordas de `StatCard` (Renda/Despesas), borda de "Economia do mês" (escala por %) e botão de Plano de contenção (escala por urgência) — todas as 3 usando as paletas em `frontend/public/brand/palettes/` |
| Cards | Fundo branco, cantos levemente arredondados (`rounded-lg`), borda esquerda colorida por significado, sombra leve |
| Botões | Cantos arredondados. **Dois estilos coexistem**: botões de ação "grandes" do cabeçalho da Home (+ Adicionar renda/despesa, Salvar dos modais) em Khand caixa alta com tracking e `font-semibold`; botões secundários por seção (+ Adicionar objetivo, + Novo investimento, Plano de contenção) em texto normal (`text-sm`, sem Khand/caixa alta/negrito). Ações por item (editar/excluir) são **ícones com contorno** (ver `IconesInvestimento.tsx`) |
| Negrito | Usado com intenção, não por padrão: títulos de seção (Objetivos, Últimas despesas, Economia nos últimos meses, Investimento CDB) e os `StatCard`s (Renda/Despesas do mês) ficam em negrito; itens de lista (nome do investimento, descrição do objetivo, itens de últimas despesas) e o valor atual do investimento **não** ficam |
| Listas longas (>2 itens) | Padrão repetido em Objetivos e Investimento CDB: em vez de esticar o card, a lista vira `max-h-* overflow-y-auto` com rolagem própria |
| Seleção por clique | Padrão do Investimento CDB: sem checkbox visível — a linha inteira é clicável (`onClick` no item) e o fundo muda pra indicar selecionado; hover dá um feedback mais sutil |
| Espaçamento | Compactado numa passada de "caber na tela sem rolar" — `space-y-4`/`gap-4` entre seções, padding dos cards em geral `p-4`/`p-5` |
| Tipografia | Khand para títulos/números/botões grandes/rótulos; Hind para texto corrido, itens de lista e o valor atual do investimento CDB (ver 4.5.3) |

## 6. Pontos que já pulam aos olhos como possíveis melhorias

*(observação neutra — não são decisões, só o que notei explorando o código)*

- O menu lateral **não tem versão mobile** (não colapsa, não vira menu inferior/hambúrguer) — se algum dia você for usar em celular, isso vai doer.
- As outras páginas (Despesas, Categorias, Rendas, Objetivos, Limites, Relatórios) ainda são de coluna única centralizada — só a Home ganhou o layout em 2 colunas/full-width até agora.
- Alguns modais ainda não foram repaginados: `ResgatarCdbModal`, `InvestirMaisModal`, `VincularInvestimentoModal` (ver 4.6).
- O botão "+ Adicionar objetivo" na página Objetivos dedicada (`ObjetivosPage.tsx`) continua com o visual antigo (`bg-blue-600`) — só a cópia dele na Home (`ObjetivosResumoHome`) foi estilizada com a marca.
- `frontend/src/components/SimularDespesaModal.tsx` ficou **órfão** (sem nenhum caller) depois que o botão "Simular despesa" saiu da Home — considerar remover o arquivo ou religar a função em outro lugar.
- O avatar do cabeçalho (4.1) é só um círculo vazio por enquanto — falta decidir de onde vem a foto/iniciais do usuário quando for implementado de verdade.

## 7. Como pedir mudanças de design a partir de agora

Para deixar o processo mais rápido entre a gente, ao pedir uma mudança tente:

1. **Apontar a seção pelo nome deste doc** — ex: "na seção 4.6 (Investimento CDB), quero..." em vez de descrever tudo de novo.
2. **Dizer o "antes vs depois"** em uma frase — ex: "hoje é uma lista de texto, quero que vire cards com barra de progresso".
3. **Se for sobre cor/estilo geral**, dizer se é *só essa seção* ou *o padrão do app inteiro* (ex: mudar o azul de destaque em todo o sistema vs. só num botão).
4. Se quiser, me manda prints ou referências de layout que você gostou — ajuda bastante mesmo sem você saber o termo técnico certo.
5. Toda vez que o layout mudar de forma relevante, posso atualizar este arquivo para ele continuar batendo com a realidade — é só pedir "atualiza o doc de layout".
