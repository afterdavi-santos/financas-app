# Layout atual — Tela Movimentações (Despesas + Rendas)

> Documento de referência para discutir melhorias de design, no mesmo espírito
> do [`home-layout-atual.md`](./home-layout-atual.md). Descreve **como está
> hoje**, não como deveria ficar. Aponte a seção pelo nome ao pedir mudanças.

## 0. O que mudou (histórico desta repaginação)

Rendas e Despesas eram dois itens separados no menu (`/despesas` e `/rendas`),
com visual antigo (azul/verde/slate padrão do Tailwind, sem a identidade da
marca). Foram unificadas em um único item de menu, **Movimentações**
(`/movimentacoes`), em passos:

1. Union num único item de menu, com abas internas (Despesas / Rendas) —
   testada primeiro como dois blocos lado a lado, depois como blocos
   empilhados, e por fim fixada como **abas clicáveis** (a versão atual).
2. Repaginação visual com a identidade da marca (`grouper-*`, Khand/Hind),
   igual já tinha sido feito na Home.
3. Ajustes de layout: largura dos cards igualada à da Home, título
   "Movimentações" adicionado, controles do cabeçalho (mês + adicionar)
   puxados para a linha das abas, e avatar placeholder adicionado.

## 1. Arquivos principais

| Arquivo | O que é |
|---|---|
| `frontend/src/pages/MovimentacoesPage.tsx` | Página "dona" da rota `/movimentacoes`: título, linha de abas + controles + avatar, e troca entre `DespesasPage`/`RendasPage` |
| `frontend/src/pages/DespesasPage.tsx` | Conteúdo da aba Despesas (StatCards, insights + despesas por categoria, lista do mês) — **não tem mais rota própria**, só é renderizada dentro de `MovimentacoesPage` |
| `frontend/src/pages/RendasPage.tsx` | Conteúdo da aba Rendas (StatCards, listas agrupadas por tipo) — idem, sem rota própria |
| `frontend/src/components/PageHeader.tsx` | Cabeçalho genérico (título opcional + slot de ações); usado por Despesas/Rendas só como *fallback* (ver seção 3) |
| `frontend/src/components/DetalheDespesasModal.tsx` | Popup de detalhamento por categoria, aberto pelos StatCards e pelo Top 5 de Despesas — já repaginado |
| `frontend/src/components/StatCard.tsx` | Mesmo card reutilizado da Home (ver `home-layout-atual.md` seção 4.4.1) |

A rota `/movimentacoes` é a única (`App.tsx`); `/despesas` e `/rendas` não
existem mais. O Sidebar tem um único item **"Movimentações"** no lugar dos
dois antigos.

## 2. Estrutura da página

```
┌─────────────────────────────────────────────────────────────┐
│ Movimentações      [mês ▾] [Leitor de fatura] [+ Adicionar]  │  ← título +
│                                                          (●)  │    controles
├─────────────────────────────────────────────────────────────┤    + avatar,
│ Despesas   Rendas                                             │  ← abas
│ ───────                                                       │    sozinhas
├───────────────────────────────────────┬───────────────────────┤
│  (conteúdo da aba ativa, 2/3 largura)  │ (1/3 — gráfico mensal │
│                                        │  da aba ativa: despe- │
│                                        │  sas ou variação de   │
│                                        │  renda)               │
└───────────────────────────────────────┴───────────────────────┘
```

- Título "Movimentações" + controles de cabeçalho + avatar numa única linha
  (`flex flex-wrap items-center justify-between`, mesmo padrão da Home) —
  **mudou em 2026-08-10**, antes os controles ficavam numa segunda linha
  junto com as abas. Título à esquerda, controles/avatar colados na ponta
  direita (empilham em largura total abaixo de `lg`, ver seção 5).
- Corpo em `grid grid-cols-1 lg:grid-cols-3` (mesmo template da Home).
- **Linha das abas ocupa as 3 colunas** (`lg:col-span-3`), agora sozinha —
  só as duas abas (Despesas | Rendas), sem mais controles nem avatar
  dividindo o espaço com elas.
- **Conteúdo da aba ativa ocupa `lg:col-span-2`** — mesma largura da coluna
  esquerda da Home, então os StatCards de Despesas/Rendas (`grid-cols-2` fixo,
  igual à Home, sem breakpoint) saem do mesmo tamanho dos cards "Renda do
  mês"/"Despesas do mês" de lá.
- **3ª coluna**: recebe via portal (`graficoSlot`, mesmo mecanismo do
  `headerSlot` — ver seção 4) o card de gráfico mensal da aba ativa —
  "Despesas dos últimos meses" na aba Despesas, "Variação de renda nos
  últimos meses" na aba Rendas (ambos ver seção 6). `graficoSlot` é o mesmo
  nó pras duas abas; cada `*Page` só porta seu próprio gráfico quando está
  montada.

## 3. Abas (Despesas / Rendas)

- Estado local em `MovimentacoesPage` (`useState<"despesas" | "rendas">`,
  padrão `"despesas"`). Clicar na aba troca qual página é renderizada — **não
  há mais layout lado a lado nem empilhado**, é sempre uma de cada vez.
- Botão da aba ativa: texto `grouper-mid` + borda inferior `grouper-mid`
  (`border-b-2`, efeito "underline"). Inativa: texto `grouper-navy/50`,
  hover `grouper-navy`. Fonte Khand caixa alta com tracking, igual aos botões
  grandes da Home.
- **Cada aba mantém seu próprio estado** (mês selecionado, seleção múltipla,
  modal aberto/editando) — trocar de aba e voltar não perde o que estava
  sendo editado na outra, porque `DespesasPage`/`RendasPage` continuam
  montados... **exceto que hoje só a aba ativa é renderizada** (a inativa
  desmonta), então na prática o estado da aba anterior é perdido ao trocar.
  Ver seção 6 (melhorias) sobre isso.

## 4. Controles do cabeçalho "puxados" para a linha do título

Esse é o ponto mais incomum da implementação, vale documentar bem (era "linha
das abas" até 2026-08-10 — o `headerSlot` subiu junto com os controles pra
linha do título, ver seção 2):

- `MovimentacoesPage` cria um nó DOM vazio (`<div ref={setHeaderSlot}>`) na
  linha do título, guardado em estado (`headerSlot`).
- Esse nó é passado como prop `headerSlot` para `DespesasPage`/`RendasPage`.
- Cada uma delas monta seus próprios controles (input de mês + botão
  "+ Adicionar despesa/renda") e, **se `headerSlot` existir**, os renderiza lá
  dentro via `createPortal` — ou seja, o JSX "mora" logicamente dentro de
  `DespesasPage`/`RendasPage` (mesmo estado, mesmos handlers), mas aparece
  visualmente na linha das abas, um componente acima na árvore.
- **Fallback**: se `headerSlot` for `null`/`undefined` (ex.: se algum dia
  `DespesasPage`/`RendasPage` voltarem a ser usadas fora de
  `MovimentacoesPage`), os controles caem para o `PageHeader` local,
  renderizado normalmente no topo da própria página. `PageHeader.titulo`
  agora é opcional — sem ele, some o `<h1>` e só os botões aparecem (usado
  aqui porque o nome "Despesas"/"Rendas" já está na aba ativa, então repetir
  como título seria redundante).
- Cada aba tem seu próprio input de mês (`type="month"`, estado local),
  formato `"YYYY-MM"`. Em Rendas isso é **novo** — antes a lista mostrava
  todas as rendas de todos os meses; agora filtra por `mesReferencia` (client-
  side, já que a API não filtra por mês) igual Despesas já fazia.
- **Aba Despesas** ganhou o botão **Leitor de fatura** entre o seletor de mês
  e "+ Adicionar despesa" (mesmo `LeitorFaturaModal.tsx` da Home, ver
  `frontend-home.md` Parte 10/11) — reaproveita `categorias` e `carregar()`
  já existentes na página, sem estado novo além do `modalLeitorFatura`.
- Os modais de nova despesa/renda abertos por essas duas abas já vêm com a
  **data/mês pré-selecionados no mês em foco daquela aba** (`dataPadrao`/
  `mesPadrao`), não sempre hoje/mês atual — mesmo padrão da Home.

## 5. Avatar

`components/Avatar.tsx` (compartilhado com a Home) — foto de perfil ou
iniciais, clique abre popup "Editar perfil" (→ `/configuracoes`). Fica na
linha do título "Movimentações", colado ao final do grupo de controles (ver
seção 2) — **desde 2026-08-10 essa posição é a mesma em qualquer largura de
tela**, não muda mais entre mobile/desktop (antes só ficava na linha das
abas em `lg`+ e subia pra linha do título só no mobile).

O seletor de mês e o botão "+ Adicionar despesa/renda" (portados via
`headerSlot`, ver seção 4) empilham em largura total no mobile, revertendo
pra lado a lado em `lg`+ — mesmas classes usadas na Home. Detalhes técnicos
em `docs/design/a11y-e-responsividade.md` (seção 2.3).

## 6. Conteúdo de cada aba

Igual descrito no doc da Home (seções 4.4.1 a 4.5.3 lá tratam de padrões
compartilhados), já com a identidade da marca aplicada:

**Despesas** (`DespesasPage.tsx`):
- 2 `StatCard`s (`destaque="negativo"`, borda `grouper-red`): "Despesas
  fixas" / "Despesas variáveis" (nome exibido; o tipo no backend continua
  `EXTRAORDINARIA`). **Não são mais clicáveis** (sem `onClick`, sem "Ver
  detalhes →") — a lista completa abaixo já cobre esse caso via filtro.
- **Linha de 3 colunas** (`grid sm:grid-cols-3`, empilha em coluna única
  abaixo do breakpoint `sm`), juntos ocupando a mesma largura que "Despesas
  por categoria" ocupava sozinha antes:
  - **2/3 esquerdos** (`sm:col-span-2`): "Despesas por categoria".
  - **1/3 direito**: "Ponto de atenção" (texto âmbar, cor não-brandbook
    mantida de propósito p/ diferenciar de alarme real) em cima e "Parabéns"
    (texto `grouper-green`) embaixo — insights vs. mês anterior, comparando
    só despesas variáveis. Empilhados num `flex flex-col`, cada um `flex-1`
    (dividem a altura da coluna igualmente). Essa coluna estica
    (`items-stretch`, padrão do grid) pra acompanhar a altura de "Despesas
    por categoria": como o tamanho máximo dela é a altura natural com 5
    categorias (a rolagem só entra a partir da 6ª — ver abaixo —, então ela
    nunca cresce além disso), Ponto de atenção + Parabéns juntos somam
    exatamente essa altura máxima.
    - **Mesmo layout dos `StatCard`s** (Despesas fixas/variáveis, ver 4.4.1
      da Home): bloco branco (`bg-white`), `rounded-lg`, borda esquerda
      colorida (`border-l-4`) — `border-amber-400` no de atenção,
      `border-grouper-green` no de parabéns (era borda fina + fundo
      âmbar/`grouper-mist`) — só que com sombra um pouco maior
      (`shadow-md`, os `StatCard`s usam `shadow-sm`).
  - Padding reduzido pra `p-4` (era `p-5`) nos 3 cards, pra caber melhor
    nessa largura menor.
  - "Despesas por categoria" (nome simplificado; antes "Top 5 categorias
    (variáveis)"): lista **todas** as categorias (não só as 5 maiores — usa
    `totalPorCategoria`, não mais `topCategorias`), com **filtro próprio**
    Todas/Fixas/Variáveis (mesmo estilo de chip da lista completa — ver
    abaixo —, porém com estado independente, default "Todas"). Lista
    clicável, abre `DetalheDespesasModal` filtrado por categoria + tipo —
    cada linha agora tem `cursor-pointer`, `rounded-md` e o mesmo hover do
    Investimento CDB da Home (`hover:bg-grouper-sky/20` **+
    `hover:shadow-md`**), sinalizando visualmente que é clicável (antes só
    tinha `hover:text-grouper-mid`, sem indicação de área clicável).
    **Divisórias**: `divide-grouper-sky/45` (era `/15`, quase invisível).
    **Rolagem**: com mais de 5 categorias (a partir da 6ª), vira
    `max-h-40 overflow-y-auto`.
  - **Ícone de gráfico** (`IconeGrafico`, 2026-08-10) ao lado esquerdo do
    filtro "Todas": abre `GraficoCategoriasModal`, popup com **todas** as
    categorias (respeitando o filtro Todas/Fixas/Variáveis ativo) num
    gráfico de **barras horizontais** (Recharts `layout="vertical"` —
    categoria no eixo Y, valor no eixo X), já ordenadas da maior pra menor.
    A partir de 10 categorias, o popup ganha rolagem **vertical** (altura
    fixa por categoria) em vez de espremer as barras.
  - **Dentro do `DetalheDespesasModal`**, a lista de despesas de cada
    categoria também ganhou rolagem própria: a partir de 8 despesas na
    mesma categoria (`length > 7`), vira `max-h-52 overflow-y-auto` em vez
    de esticar o modal — antes a única rolagem era a do modal inteiro
    (`max-h-96`, ainda existe, envolvendo todos os grupos).
- Lista "Todas as despesas do mês":
  - Cabeçalho da seção tem, no canto direito, um filtro **Todas/Fixas/
    Variáveis** (botões tipo chip): ativo com fundo `bg-grouper-sky/40`;
    inativo com hover `hover:bg-grouper-sky/25` — mesmo padrão de "azul mais
    escuro ao passar o mouse" usado nas linhas de Investimento CDB da Home.
    Filtra a lista e a seleção múltipla juntas (a seleção "todos" passa a
    valer só pros itens visíveis no filtro).
  - **Sem checkbox visível** (igual ao Investimento CDB da Home): cada linha
    inteira é clicável — clicar seleciona/deseleciona e muda o fundo pra
    `bg-grouper-sky/30`; hover dá `hover:bg-grouper-sky/20`. `BarraSelecao`
    ("X despesas selecionadas" + Excluir/Cancelar) e "Selecionar todos" só
    aparecem quando pelo menos 1 item está selecionado, **posicionados em
    cima da lista** (dentro da própria seção, logo abaixo do filtro) — não
    mais fixos no topo da página.
  - Ações por item: **ícones**, não mais texto — lápis (`IconeEditar`) abre
    `NovaDespesaModal` em modo edição (novo: modal agora aceita prop
    `despesa` opcional, com PUT em vez de POST) e X (`IconeExcluir`) exclui.
    Ambos com `onClick` parado (`stopPropagation`) pra não disparar a seleção
    da linha. Mesmo componente `IconesInvestimento.tsx` e o mesmo estilo de
    botão (contorno colorido, `p-1`, `rounded-md`) já usados no card de
    Investimento CDB da Home.
  - **Subtexto de cada item** (categoria · tipo · data) em `text-xs
    font-medium text-grouper-deep` (era `text-grouper-navy/60`, cinza-azulado
    apagado) — mesmo ajuste replicado na Home (ver `home-layout-atual.md`
    4.4.2/4.4.3) e na lista de Rendas (ver abaixo). Nome da despesa continua
    `text-grouper-ink` puro, sem negrito.
  - **Divisórias**: `divide-grouper-sky/45` (era `/15`).
  - **Rolagem**: a partir de mais itens que cabem na altura definida
    (`max-h-49 overflow-y-auto`, ajustada manualmente), a lista rola em vez
    de esticar o card — mesmo padrão já usado em Objetivos e Investimento CDB
    na Home.
- "Despesas dos últimos meses" (`GraficoDespesasMensal`, componente novo —
  mesmo formato de gráfico de barras do `GraficoEconomiaHome` da Home, mas
  **empilhado** feito o `GraficoRendaMensal`: cada coluna do mês é dividida
  em Despesas fixas (metade de baixo, vermelho escuro `#BA0000`) + Despesas
  variáveis (metade de cima, vermelho/laranja claro `#D96000` — dois tons da
  paleta de referência de `utils/cores.ts`, não os azuis do brandbook, já que
  despesa não tem "lado positivo" como a economia tem). Passar o mouse em
  qualquer uma das duas partes mostra os dois valores no tooltip padrão do
  Recharts — **não é clicável** (não seleciona mês; só o seletor de mês do
  cabeçalho faz isso — chegou a ser clicável, mas foi revertido por decisão
  de produto). Dados **não vêm mais de `compararMeses`** (esse endpoint só
  soma o total, sem separar por tipo) — busca-se `listarDespesas` de uma vez
  só pra janela inteira de 6 meses e agrupa-se por mês/tipo no cliente, igual
  ao histórico de renda. Janela **ancorada no mês em foco** (o selecionado no
  seletor de mês do filtro, `mes` do `DespesasPage`), não em hoje como a
  Home — mostra sempre os 6 meses terminando no mês escolhido (ele incluso).
  Usa `primeiroDiaMesesAtrasDoMes(mes, 5)` (helper novo em `utils/datas.ts`,
  mesma ideia do `primeiroDiaMesesAtrasISO` da Home, só que a partir de um
  mês escolhido em vez de sempre hoje). Recalculado dentro do `carregar()` do
  `DespesasPage` (que já roda de novo a cada troca de mês) e portado
  (`graficoSlot`) pra 3ª coluna da página (ver seção 2).
  - **Cor dos rótulos dos eixos**: `#102241` (`grouper-ink` — era
    `#1C4562`/`grouper-navy`, mais claro). Mesmo ajuste no gráfico de renda
    (abaixo) e no de Economia da Home.

**Seletor de mês** (Despesas e Rendas): o `<input type="month">` do
cabeçalho ganhou "cara de botão" — borda `border-2 border-grouper-mid`,
fundo branco, `font-display font-semibold` **caixa alta com tracking**
(`uppercase tracking-wide`, largura fixa `w-44` — igualado ao seletor de mês
da Home, que era o único com esse tratamento até agora; era `w-36` até
2026-08-10, aumentada junto com a troca de fonte pra Inter, ver
`frontend-home.md` Parte 14), sombra leve e hover
`hover:bg-grouper-mist` — em vez da borda fina `grouper-sky/40` genérica de
campo de formulário. Também ganhou `onClick` chamando
`e.currentTarget.showPicker?.()`, pra abrir o seletor nativo clicando em
qualquer parte do campo — antes só o ícone do calendário (a parte clicável
nativa do navegador) abria. O "x" nativo de limpar
(`::-webkit-clear-button`) é escondido via CSS global (`index.css`,
Chrome/Edge); mesmo assim, se o usuário limpar pelo popup do calendário (não
estilizável), `selecionarMes` ignora string vazia em vez de deixar o mês em
foco quebrar (mesmo guard da Home).

**Rendas** (`RendasPage.tsx`) — agora com o mesmo tratamento dado à lista de
Despesas (ver acima):
- 2 `StatCard`s (`destaque="positivo"`, borda `grouper-green`, `grid-cols-2`
  fixo sem breakpoint, igual Despesas/Home): "Renda fixa" / "Renda variável"
  (nome exibido; antes "Renda extraordinária") — como não existe tipo
  "variável" pra renda no backend, aqui é `FREELA` + `RETORNO_INVESTIMENTOS`
  somados (mesmo agrupamento que a Home já usa em outro lugar).
- **Lista única "Todas as rendas do mês"** (antes eram 3 seções separadas,
  uma por tipo — `FIXA`/`FREELA`/`RETORNO_INVESTIMENTOS`, cada uma com seu
  próprio "Selecionar todos"): mesmo filtro Todas/Fixas/Variáveis (chips,
  estado `filtroTipo`; "Variáveis" agrupa `FREELA` + `RETORNO_INVESTIMENTOS`,
  já que não existe um único tipo "variável" no backend), mesma seleção por
  clique na linha inteira (sem checkbox, fundo `bg-grouper-sky/30`
  selecionado / `hover:bg-grouper-sky/20`), `BarraSelecao`+"Selecionar
  todos" só aparecem com pelo menos 1 selecionado (posicionados acima da
  lista, dentro da seção), ícones em vez de texto para editar
  (`IconeEditar`, abre `NovaRendaModal` em modo edição) e excluir
  (`IconeExcluir`), e rolagem (`max-h-49 overflow-y-auto`) a partir de mais
  de 3 itens.
  - Como as 3 seções por tipo viraram uma lista só, o subtexto de cada item
    ganhou o tipo (`rotuloTipoRenda[renda.tipo]}` — "Fixa"/"Renda
    variável"/"Retorno de investimentos") antes do mês de referência, pra não
    perder essa informação que antes vinha do cabeçalho da seção. Esse
    subtexto está em `text-xs font-medium text-grouper-deep` (era
    `text-grouper-navy/60`) — mesmo ajuste da lista de Despesas (ver acima).
  - **Divisórias**: `divide-grouper-sky/45` (era `/15`).
- "Variação de renda nos últimos meses" (`GraficoRendaMensal`, componente
  novo — mesmo formato de gráfico de barras do `GraficoDespesasMensal`, mas
  **empilhado**: cada coluna do mês é dividida em Renda fixa (metade de
  baixo, verde escuro `#005E2F`) + Renda variável (metade de cima, verde
  claro `#568E3F` — os dois tons de `corEscalaEconomia` em `utils/cores.ts`,
  não os azuis do brandbook, já que renda é sempre "positiva"), via
  `stackId` do Recharts. Passar o mouse em qualquer uma das duas partes
  da coluna mostra os dois valores no tooltip padrão do Recharts (cor do
  texto casa com a cor de cada metade) — **não é clicável** (mesma decisão
  do gráfico de Despesas, ver acima). Dados computados a partir do array
  `rendas` já carregado (todo o histórico, sem filtro de mês no backend —
  ver seção 1) — não precisa de chamada extra à API, só agrupar por mês/tipo.
  Ancorado no mês em foco igual ao gráfico de Despesas (6 meses terminando
  no mês escolhido, ele incluso). Portado (`graficoSlot`) pra 3ª coluna da
  página (ver seção 2).
  - **Cor dos rótulos dos eixos**: `#102241` (`grouper-ink` — era
    `#1C4562`/`grouper-navy`), mesmo ajuste do gráfico de Despesas (acima).

## 7. Pontos que já pulam aos olhos como possíveis melhorias

*(observação neutra, no mesmo espírito da seção 6 do doc da Home)*

- Trocar de aba **desmonta** a aba anterior — filtro de mês, seleção
  múltipla e modal aberto da aba que você saiu se perdem. Se isso incomodar,
  dá pra manter as duas montadas e só esconder com CSS (`hidden`), trocando o
  código pra não depender de remount.
- A 3ª coluna do grid tem conteúdo nas duas abas (o gráfico mensal de cada
  uma, via `graficoSlot` — ver seção 2).
- Os portais (`headerSlot`, `graficoSlot`) são uma solução um pouco mais
  avançada que o padrão do resto do app (que não usa portals em nenhum outro
  lugar) — funcionam bem, mas é bom ter em mente ao mexer nesses arquivos: os
  controles que você vê visualmente na linha das abas e o gráfico que você vê
  na 3ª coluna **não estão** no JSX de `MovimentacoesPage`, estão dentro de
  `DespesasPage`/`RendasPage`.
- Avatar ainda é só placeholder (mesma situação da Home).
