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
- **Gráficos:** Recharts — usado no card "Economia nos últimos meses" da Home
  e nos gráficos "Despesas dos últimos meses"/"Variação de renda" de
  Movimentações (ver `movimentacoes-layout-atual.md`). A página de
  Relatórios, que também usava Recharts, foi removida (ver seção 1.1)

Arquivos principais:
| Arquivo | O que é |
|---|---|
| `frontend/src/index.css` | Tokens de cor (`grouper-*`, incluindo `grouper-green`/`grouper-red`) e fonte (`font-display`/`font-body`) |
| `frontend/public/brand/` | SVGs da logomarca (branca e preta) e `brandbook.pptx` (fonte oficial dos 5 tons de azul) |
| `frontend/public/brand/palettes/` | Duas paletas de referência (imagens) vermelho→amarelo e verde→amarelo, 7 tons cada — fonte das cores usadas em `utils/cores.ts` |
| `frontend/public/brand/47e601e3-b81f-4cf0-a040-e5b103c84221.jpeg` | Ilustração de garoupas (tema "Grouper") usada como fundo decorativo do bloco de navegação da Sidebar (ver seção 3) |
| `frontend/src/components/Layout.tsx` | Casca da aplicação (menu + área de conteúdo) |
| `frontend/src/components/Sidebar.tsx` | Menu lateral |
| `frontend/src/pages/HomePage.tsx` | Tela Home |
| `frontend/src/components/StatCard.tsx` | Card de estatística compartilhado — usado em Despesas **e** na Home (Renda do mês / Despesas do mês) |
| `frontend/src/components/EconomiaDestaque.tsx` | Card grande da Economia do mês na Home (valor + variação % vs mês anterior + borda de cor variável — ver 4.5.1) |
| `frontend/src/components/GraficoEconomiaHome.tsx` | Gráfico de barras (Recharts) da economia dos últimos 6 meses, na Home |
| `frontend/src/components/ObjetivosResumoHome.tsx` | Lista condensada de objetivos da Home, com barra de progresso (escala de azul), seleção/edição/exclusão (mesmo padrão do Investimento CDB), rolagem (>2 itens), fixar (pin) até 2 objetivos, data da meta e botão "+ Adicionar objetivo" |
| `frontend/src/components/IconesInvestimento.tsx` | Ícones SVG (editar/excluir) usados nas ações do card de Investimento CDB da Home |
| `frontend/src/components/Modal.tsx` | Modal genérico reaproveitável (título Khand + `grouper-ink` + conteúdo + fechar por X/backdrop/Esc) — usado por todos os popups de formulário e pelo pop-up de Plano de contenção |
| `frontend/src/utils/cores.ts` | `corEscalaDificuldade()`, `corEscalaEconomia()` e `corEscalaProgresso()` — as três escalas de cor por degraus da Home (ver seção 0) |
| `frontend/src/utils/contencaoRendaVariavel.ts` | `planoContencao()` (cálculo do plano) + `dificuldadeContencao()` (0 a 1, usada por `corEscalaDificuldade`) |
| `frontend/src/components/PageHeader.tsx` | Cabeçalho padrão de outras páginas (Home tem o seu próprio, inline) |
| `frontend/src/components/SimularDespesaModal.tsx` | **Órfão no momento** — não é mais chamado por nenhuma página (o botão "Simular despesa" foi removido da Home); o componente continua no repo mas sem callers |

## 1.1 Menu lateral — item "Relatórios" removido

A página de Relatórios (comparação mês a mês / ano a ano) foi **removida por
completo** — front (`RelatoriosPage.tsx`, rota `/relatorios`, item do menu,
`compararAnos`/`ResumoAnual`) e back (`GET /comparar-anos`,
`RelatorioService.compararAnos`, `ResumoAnual`). O endpoint `comparar-meses`
(`compararMeses`/`ResumoMensal`) **continua existindo** — é usado pelo
gráfico "Economia nos últimos meses" da Home (ver 4.5.2). O menu lateral
agora tem só 3 itens: Início, Movimentações, Planejamento.

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
- **A Home é full-width** (`w-full`, sem `mx-auto`/`max-w`) — Movimentações
  também usa o grid de colunas (ver `movimentacoes-layout-atual.md`);
  Planejamento usa um grid de 3 blocos próprio com altura fixa (ver seção 6).

## 3. Menu lateral (Sidebar)

Tipo: barra vertical fixa à esquerda, fundo `grouper-ink` (navy bem escuro), texto claro. Não é colapsável.

De cima para baixo:

1. **Bloco de marca** — logomarca branca (`logomarca-branca.svg`), `h-16`,
   **centralizada horizontalmente** (`justify-center`), sozinha (sem texto ao
   lado), com uma linha separadora abaixo.
2. **Bloco de navegação** (`<nav>`), com um elemento a mais desde a última
   repaginação:
   - **Imagem de fundo decorativa**: `frontend/public/brand/47e601e3-b81f-4cf0-a040-e5b103c84221.jpeg`
     (ilustração de garoupas estilo cédula, ecoando o nome "Grouper"),
     posicionada `absolute inset-0` dentro do `<nav>` (`position: relative`),
     `object-cover`, opacidade 15% (`opacity-15`), `pointer-events-none` (não
     interfere no clique dos links). Cobre a largura toda da sidebar (240px)
     e a altura toda do bloco de nav — do fim do bloco do logo até o início
     do bloco do "Sair" (ver 3 abaixo), que fica de fora (é uma `<div>`
     separada, fora do `<nav>`). Como a sidebar é `min-h-screen` e o nav é
     `flex-1`, essa altura varia com a tela do usuário (não é um valor fixo).
   - **Lista de navegação**, em `z-10` acima da imagem (senão ela ficaria por
     cima do texto), nesta ordem:
     1. Início
     2. Movimentações
     3. Planejamento
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
     dupla `grouper-mid`, fundo branco, Khand `font-semibold` **caixa alta
     com tracking** (`uppercase tracking-wide`, mesmo tratamento Khand dos
     botões "+ Adicionar" ao lado), sombra leve, hover `grouper-mist`,
     `onClick` chama `showPicker()` pra abrir o seletor clicando em qualquer
     parte do campo, não só no ícone do calendário — mesmo tratamento usado
     em Despesas/Rendas, ver `movimentacoes-layout-atual.md`. O "x" nativo de
     limpar o campo (`::-webkit-clear-button`) é escondido via CSS global em
     `index.css` (Chrome/Edge) — e, mesmo que o usuário limpe pelo popup do
     calendário nativo (ainda possível, não é estilizável), o handler
     `selecionarMes` ignora valor vazio (`if (!novoMes) return`) em vez de
     quebrar os cálculos do mês. Define o **mês em foco** (estado `mes`,
     padrão o mês atual): todos os cards, a lista e o gráfico da Home
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
- Botões: "Sim, redefinir" (`grouper-mid` sólido, leva para Planejamento, onde vive o bloco de Limites) / "Agora não" (texto `grouper-navy`, dispensa).
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
  à direita, o botão **"+ Adicionar objetivo"** (`grouper-deep` sólido,
  hover `grouper-ink`, Khand caixa alta com tracking em `text-[13px]` — sem
  negrito; mesmo tratamento dos botões "+ Novo investimento" e "Plano de
  contenção" da coluna direita, ver 4.5.3/4.5.4). Abre o `NovoObjetivoModal`
  (o mesmo componente usado no bloco Objetivos de Planejamento) e recarrega
  a lista da Home ao salvar.
- Se vazio: "Nenhum objetivo cadastrado."
- **Seleção, edição e exclusão** — a lista de objetivos ganhou o mesmo padrão
  do card de Investimento CDB (ver 4.5.3): clicar numa linha
  seleciona/deseleciona (fundo `bg-grouper-sky/30`; sem clique, hover dá
  `hover:bg-grouper-sky/20` **+ `hover:shadow-md`** — a sombra no hover é
  peculiar desse bloco, os demais blocos com seleção por clique só usam
  destaque de fundo). Com 1+ selecionados aparecem `BarraSelecao` (exclusão
  em lote) e "Selecionar todos", no mesmo padrão do CDB. Cada item também tem
  **ícones de editar/excluir** (`IconeEditar`/`IconeExcluir`, mesmo
  componente e estilo dos outros blocos) posicionados **à direita da "meta
  para DD/MM/AAAA"**, na mesma linha — o texto da data ganhou `truncate` +
  `min-w-0` no contêiner pra ceder espaço aos ícones em vez de empurrá-los
  pra fora. Editar abre o `NovoObjetivoModal` já em modo edição (prop
  `objetivo`); excluir pede confirmação (`confirm()`) e chama
  `excluirObjetivo`. Erros de exclusão sobem pro banner de erro da Home via
  prop `onErro`.
- Layout de cada item: descrição (texto normal, sem negrito, `text-grouper-ink`)
  + percentual de progresso + **ícone de fixar (pin)** na mesma linha à
  direita (esse grupo tem `stopPropagation` pra não disparar a seleção da
  linha), barra de progresso e, embaixo, uma linha com "R$X de R$Y" à
  esquerda e **"meta para DD/MM/AAAA"** (a `dataAlvo` do objetivo) + os
  ícones de editar/excluir à direita. Usa `planoObjetivo()`
  (`utils/objetivos.ts`) para o cálculo.
- **Cor da barra de progresso**: escala de azul por degraus de 20%
  (`corEscalaProgresso()`), do mais claro (`grouper-sky`, 0–20%) ao mais escuro
  (`grouper-ink`, 80–100%) — quanto maior o progresso, mais escura a barra.
- **Informações de menor destaque em azul**: a linha "R$X de R$Y" / "meta
  para DD/MM/AAAA" usa `text-xs font-medium text-grouper-deep` (era
  `text-grouper-navy/60`, cinza-azulado apagado) — mesmo ajuste replicado em
  "Últimas despesas" (4.4.3), Investimento CDB (4.5.3) e nos blocos de
  Planejamento (ver seção 6).
- **Fixar (pin)**: clicar no ícone fixa o objetivo até 2 por vez (preenche de
  `grouper-mid`; tentar fixar um 3º não faz nada, só mostra tooltip
  explicando o limite). Objetivos fixados vão pro topo da lista. Preferência
  salva só no `localStorage` (`financas.objetivosFixadosHome`).
- **Divisórias entre itens**: `divide-grouper-sky/45` (era `/15`, bem mais
  clara/quase invisível) — mesmo tom mais escuro usado em todas as listas
  com `divide-y` da Home e de Movimentações.
- **Rolagem**: com mais de 2 objetivos, a lista vira `max-h-44 overflow-y-auto`
  em vez de esticar o card — ajustado para mostrar só 2 itens antes de
  precisar rolar (era `max-h-64`, que cabia os 3 primeiros sem rolar).

#### 4.4.3 Seção "Últimas despesas"
- Card branco (`p-5`, igual ao de Objetivos — antes era `p-4`, o que
  desalinhava o título com o de Objetivos), título "Últimas despesas"
  (`font-semibold`, negrito).
- Se vazio: "Nenhuma despesa lançada neste mês ainda."
- Lista das **5** despesas mais recentes **do mês em foco** (ver 4.1, não
  necessariamente o mês atual). Cada item tem um `<div>` interno com
  `rounded-md px-3 py-2` (mesmo padrão de indentação das linhas de
  Objetivos/Investimento CDB, embora esta lista não seja clicável/selecionável):
  descrição (texto normal, sem negrito, `text-grouper-ink`) + subtexto
  (categoria · tipo · data, `text-xs font-medium text-grouper-deep` — mesmo
  ajuste de cor da seção 4.4.2) à esquerda, valor em R$ à direita (também
  texto normal, sem negrito). Divisórias `divide-grouper-sky/45` (era `/15`).

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
- **Cor dos rótulos dos eixos**: `#102241` (`grouper-ink`, texto principal —
  era `#1C4562`/`grouper-navy`, mais claro). Mesmo ajuste replicado nos
  gráficos de Despesas/Rendas em `movimentacoes-layout-atual.md`.
- Se não há histórico suficiente: "Sem histórico suficiente ainda."

#### 4.5.3 Seção "Investimento CDB"
- Card branco. Cabeçalho com título "Investimento CDB" (`font-semibold`,
  negrito) + botão **"+ Novo investimento"** (`grouper-deep` sólido, hover
  `grouper-ink`, Khand caixa alta com tracking em `text-[13px]`, sem negrito —
  mesmo tratamento de "+ Adicionar objetivo" e "Plano de contenção", ver
  4.4.2/4.5.4) à direita.
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
    - Canto superior direito: data da aplicação (`text-xs font-medium
      text-grouper-deep` — era `text-grouper-navy/60`, mesmo ajuste de cor da
      seção 4.4.2) + (se vinculado a um objetivo) só o ícone 🔗, com o nome
      do objetivo em tooltip (`title`).
    - Valor atual em destaque, cor `grouper-deep`, **fonte Hind**
      (`font-body`, sem negrito) — não usa mais Khand/`font-display` como o
      resto dos números grandes da Home.
    - Linha de ações **sempre visível**: "Investir mais" / "Resgatar" (botões
      com contorno `grouper-deep`), ícone de Editar (lápis, contorno
      `grouper-mid`) e ícone de Excluir (X, contorno vermelho). "Rendeu R$X"
      fica alinhado à direita nessa mesma linha.
  - **Divisórias entre itens**: `divide-grouper-sky/45` (era `/15`).
  - **Rolagem**: com mais de 2 investimentos, a lista vira
    `max-h-72 overflow-y-auto`.

#### 4.5.4 Botão + pop-up "Plano de contenção"
- Botão (`Plano de contenção — {mês seguinte}`, sem aspas ao redor do mês)
  no cabeçalho do card "Economia nos últimos meses" (ver 4.5.2). Agora com o
  mesmo tratamento Khand caixa alta com tracking em `text-[13px]` (sem
  negrito) dos outros botões secundários da Home (era texto normal, sem
  Khand). Clicar abre o conteúdo num `Modal` genérico centralizado na tela.
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
| Botões | Cantos arredondados. **Dois tamanhos, mas agora com o mesmo tratamento tipográfico Khand**: botões de ação "grandes" do cabeçalho (+ Adicionar renda/despesa, Salvar dos modais) em `text-sm` caixa alta com tracking e `font-semibold`; botões secundários por seção (+ Adicionar objetivo, + Novo investimento, Plano de contenção) também em Khand caixa alta com tracking, só que menores (`text-[13px]`) e **sem negrito** — antes eram texto normal sem Khand/caixa alta, foram unificados nessa repaginação. Ações por item (editar/excluir) são **ícones com contorno** (ver `IconesInvestimento.tsx`) |
| Negrito | Usado com intenção, não por padrão: títulos de seção (Objetivos, Últimas despesas, Economia nos últimos meses, Investimento CDB) e os `StatCard`s (Renda/Despesas do mês) ficam em negrito; itens de lista (nome do investimento, descrição do objetivo, itens de últimas despesas) e o valor atual do investimento **não** ficam — já testamos deixar os nomes em negrito, mas foi revertido (ver 4.4.2/4.4.3) |
| Informações de menor destaque | Cor `text-grouper-deep` (azul) + `font-medium`, `text-xs` — usado no valor/meta de Objetivos, subtexto de Últimas despesas e Investimento CDB (data), e nos blocos de Planejamento (seção 6). Antes era `text-grouper-navy/60` (cinza-azulado apagado); trocado por ter mais contraste/cor sem virar texto principal |
| Listas longas | Padrão repetido em Objetivos (>2 itens, `max-h-44`) e Investimento CDB (>2 itens, `max-h-72`): em vez de esticar o card, a lista vira `max-h-* overflow-y-auto` com rolagem própria. Divisórias entre itens (`divide-y`) em `divide-grouper-sky/45` (tom mais escuro que o `/15` original, pra ficar visível) |
| Seleção por clique | Padrão do Investimento CDB, replicado em Objetivos (ver 4.4.2): sem checkbox visível — a linha inteira é clicável (`onClick` no item) e o fundo muda pra indicar selecionado (`bg-grouper-sky/30`); hover dá um feedback mais sutil (`hover:bg-grouper-sky/20`) — em Objetivos o hover também ganhou `hover:shadow-md` |
| Espaçamento | Compactado numa passada de "caber na tela sem rolar" — `space-y-4`/`gap-4` entre seções, padding dos cards em geral `p-5` (Objetivos, Últimas despesas, Investimento CDB — Últimas despesas usava `p-4`, ajustado pra `p-5` pra alinhar o título com os outros dois) |
| Tipografia | Khand para títulos/números/botões grandes e pequenos/rótulos; Hind para texto corrido, itens de lista e o valor atual do investimento CDB (ver 4.5.3) |
| Seletor de mês nativo | O "x" de limpar (`::-webkit-clear-button`) é escondido via CSS global (`index.css`) em Chrome/Edge. Mesmo assim, se o usuário limpar pelo popup nativo do calendário (não estilizável), o handler `selecionarMes` ignora string vazia em vez de deixar o mês em foco quebrar — mesmo padrão na Home e em Despesas/Rendas |

## 6. Pontos que já pulam aos olhos como possíveis melhorias

*(observação neutra — não são decisões, só o que notei explorando o código)*

- O menu lateral **não tem versão mobile** (não colapsa, não vira menu inferior/hambúrguer) — se algum dia você for usar em celular, isso vai doer.
- Movimentações já ganhou o mesmo grid full-width da Home (ver `movimentacoes-layout-atual.md`); Planejamento usa um layout próprio de 3 blocos com altura fixa (ver seção 6 daquele contexto) — nenhuma página ficou no wrapper antigo `mx-auto max-w-4xl`.
- Alguns modais ainda não foram repaginados: `ResgatarCdbModal`, `InvestirMaisModal`, `VincularInvestimentoModal` (ver 4.6).
- `frontend/src/components/SimularDespesaModal.tsx` continua **órfão** (sem nenhum caller) desde que o botão "Simular despesa" saiu da Home — considerar remover o arquivo ou religar a função em outro lugar.
- O avatar do cabeçalho (4.1) é só um círculo vazio por enquanto — falta decidir de onde vem a foto/iniciais do usuário quando for implementado de verdade.
- A imagem de fundo do menu lateral (ver seção 3) tem um nome de arquivo genérico (hash), sem otimização de tamanho — se o app crescer, vale renomear/comprimir.

## 7. Como pedir mudanças de design a partir de agora

Para deixar o processo mais rápido entre a gente, ao pedir uma mudança tente:

1. **Apontar a seção pelo nome deste doc** — ex: "na seção 4.6 (Investimento CDB), quero..." em vez de descrever tudo de novo.
2. **Dizer o "antes vs depois"** em uma frase — ex: "hoje é uma lista de texto, quero que vire cards com barra de progresso".
3. **Se for sobre cor/estilo geral**, dizer se é *só essa seção* ou *o padrão do app inteiro* (ex: mudar o azul de destaque em todo o sistema vs. só num botão).
4. Se quiser, me manda prints ou referências de layout que você gostou — ajuda bastante mesmo sem você saber o termo técnico certo.
5. Toda vez que o layout mudar de forma relevante, posso atualizar este arquivo para ele continuar batendo com a realidade — é só pedir "atualiza o doc de layout".
