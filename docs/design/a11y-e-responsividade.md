# Acessibilidade e responsividade — base implementada

> Escopo: melhorias aplicadas direto no código existente (não é uma
> biblioteca nova nem um sistema paralelo), pra servir de padrão nas
> próximas telas/modais. Ver também `home-layout-atual.md` e
> `movimentacoes-layout-atual.md` para o layout visual em si.

## 1. Acessibilidade (WCAG 2.1 AA)

### 1.1 `Modal.tsx` — dialog acessível

Era o alvo de maior alavancagem: um componente único reaproveitado por
~15 modais do app (Nova Despesa, Nova Renda, Novo Objetivo, Plano de
contenção, etc.). Melhorar ali uma vez corrige todos de uma vez, em vez de
replicar a lógica em cada modal.

O que mudou:
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (aponta pro
  `<h2>` do título via `useId()`) — dá nome e papel ao diálogo pra quem usa
  leitor de tela.
- **Gestão de foco**: ao abrir, guarda o elemento que tinha foco antes
  (`document.activeElement`) e move o foco pro primeiro campo focável do
  modal; ao fechar, devolve o foco pra onde estava. Sem isso, um usuário de
  teclado "perde o lugar" na página de trás toda vez que fecha um popup.
- **Focus trap**: enquanto o modal está aberto, Tab/Shift+Tab ciclam só
  entre os elementos focáveis dentro dele — não dá pra vazar o foco pro
  conteúdo coberto pelo backdrop (WCAG 2.1.2, evitar armadilha de teclado
  *no sentido contrário*: aqui a "armadilha" é intencional e esperada pra
  um dialog modal, e sai normalmente pelo Esc).
- Scroll do `body` trava enquanto o modal está aberto (evita rolar o
  conteúdo de fundo "por baixo" do modal).
- Fechar continua igual: X (com `aria-label="Fechar"`, já existia), clique
  no backdrop, Esc.

**Decisão**: implementar isso à mão (sem lib de terceiros tipo
`@radix-ui/react-dialog` ou `focus-trap-react`) porque o app já tem um
único componente central pra isso — trocar de lib agora seria reescrever
15 callers pra um ganho marginal. Se o app crescer e precisar de mais
padrões de overlay (popover, tooltip, combobox), aí sim vale reavaliar.

### 1.2 Menu lateral / drawer mobile (ver seção 2.1)

Reaproveita o mesmo raciocínio de foco do Modal: abrir o drawer move o
foco pro primeiro link, fechar devolve pro botão de hambúrguer.

### 1.3 "Pular para o conteúdo" (skip link)

Em `Layout.tsx`, primeiro elemento do DOM: um link invisível
(`sr-only`) que só aparece ao ganhar foco por Tab, levando direto pro
`<main id="conteudo-principal">`. Evita que quem navega só de teclado
precise passar pelos 3 itens do menu (e, em telas mobile, pela barra
superior) toda vez que troca de página.

### 1.4 Padrões que já existiam e valem manter

- Ícones de ação (editar/excluir/fixar/fechar) sempre com `aria-label` e
  `title` (`IconesInvestimento.tsx` e nos botões que os usam) — ícone
  sozinho não tem nome acessível.
- Inputs de formulário: `focus:ring-2 focus:ring-grouper-mid` no foco (em
  vez de `outline-none` sem substituto) — indicador de foco visível, é
  WCAG 2.4.7.
- `<html lang="pt-BR">` já definido em `index.html`.

### 1.5 Checklist pra código novo

- Botão só com ícone → sempre `aria-label` (e `title` se quiser tooltip
  nativo).
- Novo overlay/popover → reaproveitar `Modal.tsx` quando fizer sentido, em
  vez de reinventar fechar-por-Esc/backdrop.
- Nunca usar `outline-none` num elemento focável sem colocar outro
  indicador de foco visível no lugar (ring, borda, fundo).
- Contraste de texto: os tons já usados no brandbook (`grouper-ink`,
  `grouper-navy`, `grouper-deep`) sobre fundo branco/`grouper-mist` passam
  em AA; evite introduzir tons `/40`, `/50`, `/60` de opacidade em texto
  pequeno — foi exatamente o que trocamos por `grouper-deep` sólido nas
  informações secundárias da Home/Movimentações/Planejamento.

## 2. Responsividade (mobile-first)

Não foi criado um sistema de grid/breakpoints paralelo — o projeto já usa
os breakpoints padrão do Tailwind (`sm` 640px / `md` 768px / `lg` 1024px /
`xl` 1280px / `2xl` 1536px) espalhados pelas páginas (`grid-cols-1
lg:grid-cols-3` na Home/Movimentações, `sm:grid-cols-3` em Despesas). A
mudança real e concreta que faltava era o menu lateral.

### 2.1 Sidebar → drawer off-canvas abaixo de `md`

- **Abaixo de 768px**: `Sidebar` vira `position: fixed`, escondida fora da
  tela (`-translate-x-full`) até o usuário abrir. Uma barra superior fixa
  (`Layout.tsx`, `md:hidden`) com logo + botão de hambúrguer
  (`aria-expanded`, `aria-controls="menu-lateral"`) controla o estado.
  Abrir mostra um backdrop escuro (fecha ao clicar fora) e desliza o menu
  pra dentro (`transition-transform`). Fecha por Esc, backdrop ou ao clicar
  num link — e, nesse caso, o conteúdo principal (`<main>`) fica `inert`
  enquanto o drawer está aberto, pra Tab não vazar pro que está escondido
  atrás do backdrop.
- **Em `md`+**: as mesmas classes (`md:static md:translate-x-0
  md:min-h-screen`) cancelam o comportamento de drawer e devolvem o layout
  fixo de 240px de antes, sem nenhuma mudança visual pra quem usa desktop.

**Decisão**: um único componente (`Sidebar.tsx`) com classes condicionais
por breakpoint, em vez de dois componentes separados (`SidebarDesktop`
/`SidebarMobile`) — o conteúdo (itens de menu, imagem de fundo, botão
Sair) é idêntico nos dois casos, só a apresentação muda; duplicar o
componente duplicaria também toda futura mudança de conteúdo do menu.

### 2.2 O que já estava bem resolvido (não mexemos)

- Home e Movimentações: grid `grid-cols-1 lg:grid-cols-3` — empilha em 1
  coluna abaixo de `lg`, sem overflow horizontal.
- Cards e listas usam `w-full`/`flex-1`, não larguras fixas em `px`.
- Textos grandes usam `rem` via classes Tailwind (`text-3xl` etc.), não
  `px` cravado.

### 2.3 Pontos que ficaram de fora deste ajuste (candidatos a próxima rodada)

- `StatCard`s (Renda/Despesas do mês) usam `grid-cols-2` fixo, sem
  breakpoint — em telas muito estreitas (<360px) os dois cards ficam
  espremidos. Deixado assim porque é proposital (mesmo tamanho em Home e
  Despesas/Rendas, ver `home-layout-atual.md` 4.4.1); se migrar mereceria
  decisão própria, não algo a reboque desta tarefa.
- Página de Planejamento usa 3 blocos com altura fixa (`h-[calc(100vh-3rem)]`)
  pensados pra desktop — não testado abaixo de `md`.
- Nenhum teste automatizado de acessibilidade (ex.: `eslint-plugin-jsx-a11y`,
  `@axe-core/react`) foi adicionado — ficou fora do escopo por ser uma
  mudança de tooling/CI, não de código de produto.
