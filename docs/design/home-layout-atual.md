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
  - `corEscalaEconomiaBotao()` — botão "Plano de contenção" (seção 4.5.4):
    mesma escala de 5 degraus de `corEscalaEconomia()` abaixo, aplicada à
    economia do mês em si (era `corEscalaDificuldade()`, 4 degraus por
    "% da categoria a cortar", removida em 2026-08-10 — ver seção 4.5.4).
  - `corEscalaEconomia()` — borda do card "Economia do mês" (seção 4.5.1): 5 degraus
    de 20% (2 vermelhos, 1 amarelo, 2 verdes) por quão perto de zero a economia está
    em relação à renda do mês.
  - `corEscalaProgresso()` — barra de progresso dos Objetivos (seção 4.4.2): 5 degraus
    de 20%, usando os 5 tons de azul da paleta base (claro → escuro), não
    verde/vermelho.

- **Tipografia:**
  - **Inter** (`font-display`) — títulos, números grandes dos cards, rótulos e botões. Era **Khand** (condensada) até 2026-08-10, trocada a pedido do usuário ("quero testar a fonte Inter") — o token Tailwind `--font-display` continua o mesmo nome, só o valor mudou (`frontend/src/index.css`), então nenhum caller precisou ser tocado. **Caixa alta + tracking** (`uppercase tracking-wide`) ficou restrita aos botões "superiores" de cada página (seletor de mês, "Leitor de fatura", "+ Adicionar renda/despesa" — ver seção 4.1) desde a mesma sessão; todos os outros botões (secundários por seção, modais, abas) passaram a usar capitalização normal, sem `uppercase`, porque a Inter não é condensada como a Khand e o texto em caixa alta ficava largo demais nesses botões menores.
  - **Hind** (`font-body`) — texto corrido, descrições, itens de lista, e o valor atual de cada investimento CDB (ver 4.5.3).
  - Ambas importadas via Google Fonts em `frontend/index.html` (o link agora inclui Khand + Hind + Inter — Khand ficou no import por segurança, caso o usuário reverta o teste, mas não é mais referenciada em nenhum token).

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
| `frontend/public/brand/garoupas_fundo_1.png` | Ilustração de garoupas estilo gravura de cédula (tema "Grouper") usada como fundo decorativo do bloco de navegação da Sidebar (ver seção 3) — era `garoupas_fundo.jpeg` até 2026-08-10, trocada por uma versão nova pedida pelo usuário; o PNG é bem mais pesado (10,5 MB vs 477 KB), sem compressão feita ainda |
| `frontend/src/components/Layout.tsx` | Casca da aplicação (menu + área de conteúdo) |
| `frontend/src/components/Sidebar.tsx` | Menu lateral |
| `frontend/src/pages/HomePage.tsx` | Tela Home |
| `frontend/src/components/StatCard.tsx` | Card de estatística compartilhado — usado em Despesas **e** na Home (Renda do mês / Despesas do mês). Fonte do valor se ajusta dinamicamente à largura disponível (ver `hooks/useAjustarFonte.ts`, seção 4.4.1) |
| `frontend/src/components/EconomiaDestaque.tsx` | Card grande da Economia do mês na Home (valor + variação % vs mês anterior + borda de cor variável — ver 4.5.1). Mesmo ajuste dinâmico de fonte do `StatCard` |
| `frontend/src/components/SeletorMes.tsx` | Seletor de mês próprio (botão + popup HTML/CSS), substitui o `<input type="month">` nativo — ver 4.1 |
| `frontend/src/components/SeletorData.tsx` | Seletor de dia completo próprio, substitui todo `<input type="date">` nativo dos modais (Nova despesa, Aportar, Novo objetivo, Novo investimento CDB, etc.) |
| `frontend/src/components/GradeAnos.tsx` | Grade de anos em blocos de 12 (navegável), usada dentro do popup de `SeletorMes`/`SeletorData` ao clicar no rótulo do ano — pular direto pra um ano distante sem precisar avançar um por um |
| `frontend/src/components/GraficoEconomiaHome.tsx` | Gráfico de barras (Recharts) da economia dos últimos 6 meses, na Home |
| `frontend/src/components/ObjetivosResumoHome.tsx` | Lista condensada de objetivos da Home, com barra de progresso (escala de azul), seleção/edição/exclusão (mesmo padrão do Investimento CDB), rolagem (>2 itens), fixar (pin) até 2 objetivos, data da meta e botão "+ Adicionar objetivo" |
| `frontend/src/components/IconesInvestimento.tsx` | Ícones SVG (editar/excluir) usados nas ações do card de Investimento CDB da Home |
| `frontend/src/components/Modal.tsx` | Modal genérico reaproveitável (título Khand + `grouper-ink` + conteúdo + fechar por X/backdrop/Esc) — usado por todos os popups de formulário e pelo pop-up de Plano de contenção |
| `frontend/src/utils/cores.ts` | `corEscalaEconomiaBotao()`, `corEscalaEconomia()` e `corEscalaProgresso()` — as escalas de cor por degraus da Home (ver seção 0) |
| `frontend/src/utils/contencaoRendaVariavel.ts` | `planoContencao()` (cálculo do plano de contenção) |
| `frontend/src/hooks/useAjustarFonte.ts` | Encolhe a fonte de um valor até caber na largura do card (usado por `StatCard`/`EconomiaDestaque`), em vez de um breakpoint fixo — reage ao espaço real disponível em qualquer largura de tela |
| `frontend/src/hooks/useAjustarFonteSincronizada.ts` | Como acima, mas coordena vários cards ao mesmo tempo: todos usam o menor tamanho entre eles (ex.: "Despesas fixas"/"Despesas variáveis" em Movimentações, ver `movimentacoes-layout-atual.md`) |
| `frontend/src/hooks/usePosicaoPopup.ts` | Posiciona (via portal no `<body>`) os popups de `SeletorMes`/`SeletorData`, escapando do `overflow-y-auto` do card de `Modal.tsx` |
| `frontend/src/components/PageHeader.tsx` | Cabeçalho padrão de outras páginas (Home tem o seu próprio, inline) |
| `frontend/src/components/SimularDespesaModal.tsx` | **Órfão no momento** — não é mais chamado por nenhuma página (o botão "Simular despesa" foi removido da Home); o componente continua no repo mas sem callers |
| `frontend/src/components/Avatar.tsx` | Avatar compartilhado (Home/Movimentações) — foto ou iniciais, prop `menu` abre popup "Editar perfil" |
| `frontend/src/context/PerfilContext.tsx` | Dados do usuário logado (nome/email/foto), buscados uma vez ao montar o `Layout` — ver `frontend-home.md` Parte 10 |
| `frontend/src/pages/ConfiguracoesPage.tsx` | Página de perfil (dados pessoais, senha, foto) — ver `frontend-home.md` Parte 10 |
| `frontend/src/components/LeitorFaturaModal.tsx` | Importação de despesas via CSV da fatura Nubank (upload → revisão → categorização em lote) — ver `frontend-home.md` Parte 10 |

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
- **Altura própria travada na tela** (`sticky top-0 h-screen`, era `min-h-screen`):
  antes, se o conteúdo ao lado (`<main>`) fosse mais alto que a tela (ex.:
  Configurações, com vários cards), a sidebar esticava junto (comportamento
  padrão do flex), empurrando o rodapé ("Sair") pra fora da área visível —
  só aparecia rolando a página inteira. Agora a sidebar fica sempre do
  tamanho da tela, grudada no topo, com scroll independente do `<main>`.
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
   - **Imagem de fundo decorativa**: `frontend/public/brand/garoupas_fundo_1.png`
     (ilustração de garoupas estilo cédula, ecoando o nome "Grouper"),
     posicionada `absolute inset-0` dentro do `<nav>` (`position: relative`),
     `object-cover`, opacidade 15% (`opacity-15`), `pointer-events-none` (não
     interfere no clique dos links). Cobre a largura toda da sidebar (240px)
     e a altura toda do bloco de nav — do fim do bloco do logo até o início
     do bloco do "Sair" (ver 3 abaixo), que fica de fora (é uma `<div>`
     separada, fora do `<nav>`). Como a sidebar é `h-screen` e o nav é
     `flex-1`, essa altura varia com a tela do usuário (não é um valor fixo).
   - **Lista de navegação**, em `z-10` acima da imagem (senão ela ficaria por
     cima do texto), nesta ordem:
     1. Início
     2. Movimentações
     3. Planejamento
   - Item ativo (página atual): fundo `grouper-mid` (azul médio), texto branco.
   - Itens inativos: texto branco 70% opaco, fica branco sólido com fundo branco 10% ao passar o mouse.
   - (O código já tem suporte para itens desabilitados/"em breve", mas hoje todos estão ativos.)
3. **Rodapé** — separado por uma linha, **fora do bloco de navegação
   principal** (não tem a lógica de "em breve" dos itens acima): item
   **"Configurações"** (mesmo tratamento visual de active/hover dos itens do
   menu, navega pra `/configuracoes` — ver `frontend-home.md` Parte 10) e,
   abaixo, o botão "Sair", ambos ocupando a largura toda.

## 4. Tela Home — layout full-width em 2 colunas

A partir da repaginação inspirada num dashboard de referência ("Capital Flow"), a
Home deixou de ser uma coluna central limitada (`max-w-4xl`) e passou a ocupar a
largura toda do conteúdo (`w-full`, sem `mx-auto`/`max-w`). Abaixo do cabeçalho e
dos banners, o corpo principal é um grid de 2 colunas (`lg:grid-cols-3`, coluna
esquerda com `lg:col-span-2` — proporção ~2:1), que empilha em 1 coluna só em
telas estreitas (`grid-cols-1` abaixo do breakpoint `lg`).

### 4.1 Cabeçalho
- **Uma única linha** (`flex flex-wrap items-center justify-between`, sem
  grid de colunas — abandonado o `lg:grid-cols-3` que a área de ações usava
  antes, ficava apertada demais com 4 controles + avatar disputando 1/3 da
  largura): título "Início" na ponta esquerda, e o grupo inteiro de
  controles + avatar na ponta direita, colados uns nos outros
  (`lg:gap-3`) — o avatar sempre no canto superior direito da página,
  imediatamente após o último botão.
- **Seletor de mês + 3 botões + avatar**, nessa ordem, todos no mesmo grupo à
  direita:
  1. **Seletor de mês** (`components/SeletorMes.tsx`, variante
     `cabecalho` — botão "cara de botão": borda dupla `grouper-mid`, fundo
     branco, Khand `font-semibold` **caixa alta com tracking**
     (`uppercase tracking-wide`, mesmo tratamento Khand dos botões
     "+ Adicionar" ao lado), sombra leve, hover `grouper-mist`). **Não é
     mais um `<input type="month">` nativo** (2026-08-11) — o calendário
     nativo do navegador não é estilizável nem reposicionável via CSS e
     podia vazar da borda da tela no mobile; agora é um popup HTML/CSS
     próprio (grade de meses + `GradeAnos.tsx` pra pular direto a um ano
     distante), posicionado via portal no `<body>` (`hooks/
     usePosicaoPopup.ts`) pra nunca ficar cortado nem vazar da tela, em
     qualquer navegador. Mesmo componente usado em Despesas/Rendas, ver
     `movimentacoes-layout-atual.md`. `selecionarMes` ignora valor vazio
     (`if (!novoMes) return`) em vez de quebrar os cálculos do mês. Define
     o **mês em foco** (estado `mes`,
     padrão o mês atual): todos os cards, a lista e o gráfico da Home
     mostram dados desse mês, não necessariamente "hoje". Largura fixa
     `w-44` (176px — era `w-36`/144px até 2026-08-10, aumentada porque a
     Inter não é condensada como a Khand e o texto do seletor não cabia mais).
  2. **Leitor de fatura** (`grouper-deep` sólido, hover `grouper-ink` — abre
     o `LeitorFaturaModal` de importação da fatura Nubank via CSV, ver
     `frontend-home.md` Parte 10; o mesmo botão também existe na aba
     Despesas de Movimentações, ver `movimentacoes-layout-atual.md`).
  3. **+ Adicionar renda** (Khand, caixa alta, tracking, `font-semibold`,
     `grouper-mid` sólido)
  4. **+ Adicionar despesa** (idem, `grouper-ink` sólido)
  5. **Avatar** (`components/Avatar.tsx`, compartilhado com Movimentações):
     círculo de 40px (`h-10 w-10`) mostrando a foto de perfil (se houver) ou
     as iniciais do nome. Clicar abre um pequeno menu ("Editar perfil" →
     navega pra `/configuracoes`), fecha ao clicar fora ou Esc.
- As despesas/renda de nova despesa/renda abertas por esses botões já vêm com
  a **data/mês pré-selecionados no mês em foco** (`dataPadrao`/`mesPadrao`),
  não sempre hoje/mês atual — mesmo padrão em Despesas e Rendas de
  Movimentações.
- As caixinhas de **Renda do mês / Despesas do mês** viraram `StatCard`s no
  topo da coluna esquerda (ver 4.4.1) — mostram o mês em foco, não sempre o
  mês atual.

#### 4.1.1 No mobile (abaixo de `lg`) o cabeçalho muda de forma

- **Título sozinho na primeira linha.**
- **Seletor de mês + os 3 botões + avatar** empilham em largura total, cada
  um numa linha — em `lg`+ voltam a ficar lado a lado, colados, como descrito
  acima.

Detalhes técnicos e o "porquê" em `docs/design/a11y-e-responsividade.md`
(seção 2.2) — o mesmo padrão foi replicado em Movimentações (ver
`movimentacoes-layout-atual.md`).

### 4.2 Banner de lembrete mensal *(aparece só uma vez por mês)*
- Faixa `grouper-mist` com borda `grouper-sky`/50: "O mês virou! Deseja redefinir seus limites de despesas?"
- Botões: "Sim, redefinir" (`grouper-mid` sólido, leva para Planejamento, onde vive o bloco de Limites) / "Agora não" (texto `grouper-navy`, dispensa).
- Continua full-width, acima do grid de 2 colunas.

### 4.3 Banner de erro *(só se der erro ao carregar dados)*
- Faixa preta suave (`bg-black/5`, borda esquerda preta) com "⚠" + texto do erro em `grouper-ink`. Esse é o padrão de alerta reaproveitado nos formulários (ver 4.6).
- Continua full-width, acima do grid de 2 colunas.

### 4.4 Coluna esquerda (mais larga) — de cima para baixo

> **No mobile (abaixo de `lg`) a ordem muda**: seletor de abas (4.4.1)
> → Objetivos → Últimas despesas → Investimento CDB (4.5.3) → gráfico
> "Economia nos últimos meses" (4.5.2, por último) — ou seja, abaixo de
> `lg` as colunas esquerda/direita deixam de existir como agrupamento
> visual e os blocos intercalam livremente numa ordem própria. Detalhes
> técnicos em `docs/design/a11y-e-responsividade.md` (seção 2.2); em
> `lg`+ nada disso se aplica, o desktop é exatamente o descrito abaixo.

#### 4.4.1 Cards "Renda do mês" / "Despesas do mês" (`StatCard`)
- Topo da coluna esquerda: grid de 2 colunas com os `StatCard`s de Renda
  (borda `grouper-green`) e Despesas (borda `grouper-red`) — as duas únicas
  exceções de verde/vermelho fora das escalas por degraus (ver seção 0).
- Rótulo (`text-xs sm:text-sm` — reduzido no mobile pra não quebrar linha em
  títulos maiores como "Despesas variáveis" em Movimentações, ver
  `movimentacoes-layout-atual.md` —, `grouper-ink`, maiúsculo,
  `font-semibold`) e valor (base `text-3xl` Khand `font-bold`) — ambos em
  negrito.
- **Fonte do valor é dinâmica** (2026-08-11, `hooks/useAjustarFonte.ts`):
  em vez de um breakpoint fixo, encolhe de verdade só o quanto precisar
  (medindo `scrollWidth`/`clientWidth`) até o valor caber no card, com
  `truncate` como rede de segurança final — cobre valores grandes/com mais
  casas decimais em qualquer largura de tela. Em Despesas/Rendas
  (`movimentacoes-layout-atual.md`), os dois cards lado a lado (fixas/
  variáveis) usam `hooks/useAjustarFonteSincronizada.ts` pra sempre mostrar
  o valor no **mesmo** tamanho de fonte (o menor entre os dois), em vez de
  cada um encolher independente.
- **No mobile** esses 2 cards (e o de Economia do mês, 4.5.1) somem daqui
  e viram um **seletor de 3 abas** ("Renda" / "Despesas" / "Economia"),
  logo abaixo do cabeçalho (ver 4.1.1): abas em linha, mostrando o card da
  aba selecionada (reaproveitando o mesmo `StatCard`/`EconomiaDestaque`)
  numa faixa abaixo delas. Em `lg`+ os 3 cards voltam a ficar sempre
  visíveis, como sempre foi.

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
- **Incentivo** (2026-08-10): quando o objetivo tem `incentivo` preenchido
  (campo existia desde a Parte 4 do doc de progresso, mas nunca aparecia em
  lugar nenhum), um ícone `ⓘ` (`IconeInfo`, SVG próprio, mesmo estilo de
  Editar/Excluir) aparece ao lado do **título** do objetivo — passar o mouse
  (ou focar por teclado) mostra o texto do incentivo via `Tooltip`. Mesmo
  tratamento em `PlanejamentoObjetivos.tsx`.
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
  maiúsculo), valor em Khand `font-bold` (base `text-3xl`, com o mesmo
  ajuste dinâmico de fonte do `StatCard` — ver 4.4.1 —, já que este card
  vive na coluna direita estreita e um valor negativo grande podia vazar),
  cor `grouper-deep` se positiva/`grouper-ink` se negativa.
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
- **No mobile** esse card não fica fixo aqui — é a aba "Economia" do
  seletor descrito em 4.4.1 (mesmo componente `EconomiaDestaque`, sem
  duplicação de lógica).

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
  no cabeçalho do card "Economia nos últimos meses" (ver 4.5.2). Mesmo
  tratamento Khand caixa alta com tracking em `text-[13px]` (sem negrito) dos
  outros botões secundários da Home. Clicar abre o conteúdo num `Modal`
  genérico centralizado na tela. **"Mês seguinte" é relativo ao mês em foco**
  (`mesSeguinteYYYYMM(mes)`, ver 4.1), não ao mês seguinte ao real — projeta
  a partir do mês que está sendo visto, não de hoje.
- **Meta do plano** (2026-08-10, mudou de critério): antes mirava em
  economia = 0 em relação à renda fixa ("não fechar negativo"); agora mira
  em fechar o mês com pelo menos **10% de folga** sobre a renda fixa —
  `valorNecessarioReduzir = max(0, despesas − rendaFixa × 0.9)`
  (`HomePage.tsx`, constante `MARGEM_FOLGA_RENDA_FIXA`).
- **Cor do botão** (`utils/cores.ts`, `corEscalaEconomiaBotao` — 2026-08-10,
  mudou de critério): reflete a **economia do mês em si**
  (`economia / renda × 100`, mesma fórmula e mesma escala de degraus por 20%
  já usada na borda do card "Economia do mês", ver `corEscalaEconomia`), não
  mais "% da categoria variável selecionada que precisaria ser cortada" — o
  critério antigo (`corEscalaDificuldade`/`dificuldadeContencao`, removidos)
  podia dar verde mesmo com a economia bem negativa, se a categoria
  escolhida pro corte fosse grande o bastante pra um corte pequeno em %
  cobrir o buraco. Só o degrau amarelo (`#ECA000`) usa texto escuro pra
  contraste; os outros 4 tons usam texto branco.
- **Conteúdo do modal** (reformulado em 2026-08-10):
  - Faixa verde "✓ Sua renda fixa (R$X) cobre as despesas deste mês (R$Y) —
    nada precisa ser reduzido." quando não há nada a cortar (mesmo texto pros
    dois casos — com ou sem renda variável no mês; antes tinha uma frase
    diferente pra cada).
  - Quando há algo a cortar: **um único parágrafo em negrito**
    (`font-semibold`, era dois parágrafos com cores diferentes) juntando a
    explicação (renda fixa insuficiente, com ou sem renda variável) e a
    chamada pro corte ("...considere seguir este plano de contenção:") — não
    cita mais o valor total a reduzir no texto corrido, só implícito na soma
    dos cards abaixo.
  - **Categorias em cards** (era uma lista simples com `divide-y`): cada
    categoria vira um card branco (`rounded-lg border-l-4 border-grouper-red
    shadow-sm`, mesmo padrão visual dos blocos "Ponto de atenção"/"Parabéns"
    de Despesas) — nome + gasto atual à esquerda, valor a cortar em destaque
    (vermelho, negrito) + percentual como legenda menor à direita.
  - Aviso "não cobre" (quando cortar tudo ainda não é suficiente) continua
    igual, faixa preta.
  - **Aviso de economia já negativa foi removido** (existia como uma faixa
    vermelha extra, chegou a mudar de posição algumas vezes na mesma sessão)
    — decisão do usuário de simplificar o popup.

### 4.6 Modais

Abrem por cima da tela ao clicar nos botões de ação: Nova Despesa, Nova Renda,
Novo Investimento CDB, Novo Objetivo (ver 4.4.2), Resgatar CDB, Investir Mais,
e o pop-up de Plano de contenção.

- **Repaginados com a identidade da marca** (Inter/Hind + `grouper-*`): Nova
  Despesa, Nova Renda, Novo Investimento CDB, Novo Objetivo, e o próprio
  `Modal.tsx` genérico (chrome compartilhado por todos, incluindo o pop-up de
  Plano de contenção). Labels em `grouper-navy`, inputs com borda
  `grouper-sky/40` e foco `grouper-mid`, botão "Salvar" em `grouper-mid`,
  "Cancelar" em texto `grouper-navy`. Mensagens de erro usam o mesmo padrão
  de alerta preto do banner de erro da Home (seção 4.3); avisos de sucesso
  (ex.: "dentro do limite") usam o padrão `border-grouper-mid` +
  `bg-grouper-mist` do modal de Plano de contenção.
- **Borda azul-marinho em todo popup** (2026-08-10): `Modal.tsx` ganhou
  `border-2 border-grouper-ink` como valor padrão de `classeCard` (era só do
  `LeitorFaturaModal`, que passava isso explicitamente) — propaga
  automaticamente pros ~15 modais que usam o componente genérico, sem
  precisar tocar em cada um. Os 2 mini-popups de confirmação que vivem
  dentro do próprio `LeitorFaturaModal` (fora do `Modal.tsx`) ganharam a
  mesma borda à mão, pra ficar consistente.
- **Ainda não repaginados** (continuam com o visual antigo slate padrão do
  Tailwind pros labels/inputs): `ResgatarCdbModal`, `InvestirMaisModal`,
  `VincularInvestimentoModal` — fora do escopo até agora. Só os botões de
  ação principais (Resgatar/Investir) já foram corrigidos pra
  `bg-grouper-mid`/`hover:bg-grouper-deep` (2026-08-10, estavam
  `bg-indigo-600`/roxo, cor que não existe em nenhum outro botão do app);
  `ResgatarCdbModal` também perdeu o botão "Resgatar tudo" (pedido do
  usuário) — só resgate parcial agora, em 2 cliques (simula → confirma).

### 4.6.1 `ConfirmacaoModal.tsx` — confirmações genéricas (2026-08-10)

Substituiu **todos** os `confirm()`/`alert()` nativos do navegador restantes
no app (~13 usos: excluir despesa/renda/objetivo/limite/investimento em lote
ou individual, remover aporte) — os popups de exclusão de categoria já eram
próprios desde antes (`ExcluirCategoriaModal`/
`ExcluirCategoriasSelecionadasModal`, ver seção 7 do doc de progresso Parte
7). Componente genérico (título + mensagem + Cancelar/Confirmar), reaproveita
`Modal.tsx` (sai com a borda padrão de graça), com variante `perigo`
(vermelho, default) ou `neutro` (azul) pro botão de ação, e estado de
"confirmando..." enquanto a ação roda.

## 5. Padrões visuais observados

| Elemento | Padrão |
|---|---|
| Paleta | 5 tons de azul da marca (`grouper-sky` → `grouper-ink`) para hierarquia/estrutura + preto/branco para alarme real — ver seção 0. **Exceções deliberadas de verde/vermelho**: bordas de `StatCard` (Renda/Despesas), borda de "Economia do mês" (escala por %) e botão de Plano de contenção (escala por urgência) — todas as 3 usando as paletas em `frontend/public/brand/palettes/` |
| Cards | Fundo branco, cantos levemente arredondados (`rounded-lg`), borda esquerda colorida por significado, sombra leve |
| Botões | Cantos arredondados. **Caixa alta + tracking restrita aos botões "superiores"** (2026-08-10): só os botões de topo de cada página (seletor de mês, "Leitor de fatura", "+ Adicionar renda/despesa") continuam em `uppercase tracking-wide`; todos os outros — secundários por seção (+ Adicionar objetivo, + Novo investimento, Plano de contenção), "Salvar"/"Cancelar" dos modais, abas — usam capitalização normal (sem `uppercase`), porque o texto em caixa alta ficava largo demais com a Inter (não condensada como a Khand era). Ambos os grupos continuam em `font-display`. Ações por item (editar/excluir) são **ícones com contorno** (ver `IconesInvestimento.tsx`) |
| Negrito | Usado com intenção, não por padrão: títulos de seção (Objetivos, Últimas despesas, Economia nos últimos meses, Investimento CDB) e os `StatCard`s (Renda/Despesas do mês) ficam em negrito; itens de lista (nome do investimento, descrição do objetivo, itens de últimas despesas) e o valor atual do investimento **não** ficam — já testamos deixar os nomes em negrito, mas foi revertido (ver 4.4.2/4.4.3) |
| Informações de menor destaque | Cor `text-grouper-deep` (azul) + `font-medium`, `text-xs` — usado no valor/meta de Objetivos, subtexto de Últimas despesas e Investimento CDB (data), e nos blocos de Planejamento (seção 6). Antes era `text-grouper-navy/60` (cinza-azulado apagado); trocado por ter mais contraste/cor sem virar texto principal |
| Listas longas | Padrão repetido em Objetivos (>2 itens, `max-h-44`) e Investimento CDB (>2 itens, `max-h-72`): em vez de esticar o card, a lista vira `max-h-* overflow-y-auto` com rolagem própria. Divisórias entre itens (`divide-y`) em `divide-grouper-sky/45` (tom mais escuro que o `/15` original, pra ficar visível) |
| Seleção por clique | Padrão do Investimento CDB, replicado em Objetivos, Rendas, Despesas e nos blocos de Planejamento: sem checkbox visível — a linha inteira é clicável (`onClick` no item) e o fundo muda pra indicar selecionado (`bg-grouper-sky/30`); hover dá um feedback mais sutil (`hover:bg-grouper-sky/20`) — em Objetivos o hover também ganhou `hover:shadow-md`. Também alcançável por teclado (2026-08-11, `utils/teclado.ts`): `role="button"` + `tabIndex={0}` + Enter/Espaço ativa igual ao clique, com anel de foco visível (`focus-visible:ring-2`) — antes só funcionava no mouse/toque |
| Espaçamento | Compactado numa passada de "caber na tela sem rolar" — `space-y-4`/`gap-4` entre seções, padding dos cards em geral `p-5` (Objetivos, Últimas despesas, Investimento CDB — Últimas despesas usava `p-4`, ajustado pra `p-5` pra alinhar o título com os outros dois) |
| Tipografia | Inter (`font-display`, era Khand até 2026-08-10) para títulos/números/botões/rótulos; Hind (`font-body`) para texto corrido, itens de lista e o valor atual do investimento CDB (ver 4.5.3) |
| Seletor de mês/data | **Não são mais `<input type="month"/"date">` nativos** (2026-08-11) — ver `components/SeletorMes.tsx`/`SeletorData.tsx` na tabela de arquivos principais. O CSS que escondia o "x" de limpar dos inputs nativos foi removido (não existem mais); o handler `selecionarMes` continua ignorando string vazia (guarda defensiva) |
| Tooltip próprio do app | `components/Tooltip.tsx` (2026-08-10) substitui o atributo `title` nativo do navegador (cor controlada pelo SO/tema, não estilizável) em todo botão/ícone que precisa de legenda — fundo branco, texto `grouper-ink`, aparece no hover **e** no foco por teclado (`focus-within`), mas tira o próprio foco ao sair com o mouse (senão ficava preso na tela até outro clique, já que clicar também foca o botão). **O elemento-gatilho precisa ser focável** (`<button>`, não `<span>`) pra funcionar no mobile, onde não existe `:hover` — achado real em 2026-08-11: o ícone ⓘ de incentivo dos Objetivos e o selo "Possível duplicata" do Leitor de fatura usavam `<span>` e eram inacessíveis no toque; corrigidos pra `<button>`. Prop `posicao` ("centro" padrão ou "direita") evita que o balão vaze pra fora de listas com `overflow-y-auto` quando o gatilho está na borda direita (ex.: ícones de editar/excluir, sempre os últimos de uma linha). Prop `vertical` ("cima" padrão ou "baixo", 2026-08-10) resolve o mesmo problema no eixo Y — sem espaço acima, o balão do **primeiro item** de uma lista com rolagem própria ficava cortado; aplicado nesse item em todas as listas afetadas |

## 6. Pontos que já pulam aos olhos como possíveis melhorias

*(observação neutra — não são decisões, só o que notei explorando o código)*

- ~~O menu lateral não tem versão mobile~~ **Resolvido**: abaixo de `md`
  (768px) a sidebar vira um drawer off-canvas acionado por uma barra
  superior com botão de hambúrguer (`Layout.tsx`), com backdrop, fecha por
  Esc/clique fora/clique num link, foco move pro primeiro link ao abrir e
  volta pro hambúrguer ao fechar, e o conteúdo principal fica `inert`
  enquanto o drawer está aberto. Ver `docs/design/a11y-e-responsividade.md`.
- Movimentações já ganhou o mesmo grid full-width da Home (ver `movimentacoes-layout-atual.md`); Planejamento usa um layout próprio de 3 blocos com altura fixa — nenhuma página ficou no wrapper antigo `mx-auto max-w-4xl`.
- **Cabeçalho de Movimentações e Planejamento igualado ao da Home (2026-08-10)**: nas duas páginas, título + botões + avatar agora dividem uma única linha (`flex flex-wrap items-center justify-between`), mesmo padrão desta seção (4.1) — antes ficavam numa segunda linha, junto com as abas (Movimentações) ou dentro de cada bloco (Planejamento). Em Planejamento, os 3 botões "+ Adicionar X" de cada bloco sobem pra essa linha via o mesmo mecanismo de portal (`headerSlot`) que Movimentações já usava pros seus controles.
- Alguns modais ainda não foram repaginados: `ResgatarCdbModal`, `InvestirMaisModal`, `VincularInvestimentoModal` (ver 4.6).
- `frontend/src/components/SimularDespesaModal.tsx` continua **órfão** (sem nenhum caller) desde que o botão "Simular despesa" saiu da Home — considerar remover o arquivo ou religar a função em outro lugar.
- A imagem de fundo do menu lateral (ver seção 3) tem um nome de arquivo genérico (hash), sem otimização de tamanho — se o app crescer, vale renomear/comprimir.

## 7. Como pedir mudanças de design a partir de agora

Para deixar o processo mais rápido entre a gente, ao pedir uma mudança tente:

1. **Apontar a seção pelo nome deste doc** — ex: "na seção 4.6 (Investimento CDB), quero..." em vez de descrever tudo de novo.
2. **Dizer o "antes vs depois"** em uma frase — ex: "hoje é uma lista de texto, quero que vire cards com barra de progresso".
3. **Se for sobre cor/estilo geral**, dizer se é *só essa seção* ou *o padrão do app inteiro* (ex: mudar o azul de destaque em todo o sistema vs. só num botão).
4. Se quiser, me manda prints ou referências de layout que você gostou — ajuda bastante mesmo sem você saber o termo técnico certo.
5. Toda vez que o layout mudar de forma relevante, posso atualizar este arquivo para ele continuar batendo com a realidade — é só pedir "atualiza o doc de layout".
