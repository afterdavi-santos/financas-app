# Frontend — Gestão de Finanças Pessoais

React 19 + TypeScript + Vite 8 · Tailwind CSS v4 · react-router-dom · Recharts.
Pasta `frontend/`, no mesmo repositório do backend.

Ver também: [BACKEND.md](BACKEND.md) · [SEGURANCA.md](SEGURANCA.md) · [COMO-RODAR.md](COMO-RODAR.md)

---

## 1. Identidade visual

O app segue um brandbook próprio ("Grouper"). Tokens definidos em `src/index.css` via
`@theme` — **sem biblioteca de componentes** (nada de MUI/Chakra).

| Token | Hex | Uso |
|---|---|---|
| `grouper-sky` | `#86C3EB` | realces, bordas sutis, tags claras |
| `grouper-mid` | `#5399CD` | ação principal, item ativo do menu |
| `grouper-deep` | `#244C7E` | acento profundo — investimentos, links secundários |
| `grouper-navy` | `#1C4562` | texto secundário sobre fundo claro |
| `grouper-ink` | `#102241` | texto principal, fundo do menu lateral |
| `grouper-mist` | `#EEF5FB` | fundo da página |
| `grouper-green` | `#005E2F` | positivo — renda, economia |
| `grouper-red` | `#BA0000` | negativo — despesas |
| preto / branco | — | reservados para **alarme real** (avisos, banners de erro) |

**Escalas por degraus** (não degradê contínuo), em `utils/cores.ts`: `corEscalaEconomia()`
e `corEscalaEconomiaBotao()` (5 degraus de 20%, 2 vermelhos → amarelo → 2 verdes),
`corEscalaProgresso()` (5 tons de azul da paleta base). As cores vêm de duas paletas de
referência em `public/brand/palettes/`.

**Tipografia**: **Inter** (`font-display`) para títulos, números grandes, rótulos e botões;
**Hind** (`font-body`) para texto corrido. Caixa alta + tracking ficou restrita aos botões
"superiores" de cada página — a Inter não é condensada, e caixa alta em botão pequeno fica
largo demais.

Logomarca em `public/brand/` (SVGs branca e preta).

---

## 2. Estrutura

```
src/
  api/        um arquivo por recurso + client.ts (axios) + erros.ts
  components/ ~35 componentes; Modal, StatCard, seletores, modais de formulário
  context/    AuthContext (token), PerfilContext (usuário logado)
  hooks/      useSelecao, useMesSelecionado, useAjustarFonte, usePosicaoPopup, ...
  pages/      Login, Register, Home, Movimentacoes, Planejamento, Configuracoes
  routes/     ProtectedRoute (guarda de layout com <Outlet/>)
  types/      espelham os DTOs do backend
  utils/      moeda, datas, rotulos, cores, busca, despesasResumo, objetivos, ...
```

**Rotas**: `/login` e `/registrar` públicas; o resto dentro de
`ProtectedRoute > Layout > página`. `ProtectedRoute` é guarda de layout: renderiza
`<Outlet/>` se autenticado, senão `<Navigate to="/login" replace/>`.

**Páginas**: Home (dashboard), Movimentações (abas Despesas/Rendas), Planejamento
(Objetivos, Limites, Categorias), Configurações (perfil). A antiga página de Relatórios foi
removida por completo — só o endpoint `comparar-meses` sobrevive, alimentando o gráfico de
economia da Home.

---

## 3. Convenções

- **`import type { ... }`** para imports só de tipo — `verbatimModuleSyntax` está ligado e o
  build quebra sem isso.
- **Erros de API sempre por `mensagemDeErro()`** (`api/erros.ts`), que lê o campo `mensagem`
  de qualquer `ErrorResponse` do backend.
- **Comentários explicando conceitos de React** — o autor é forte em backend e fraco em
  frontend; comentário que explica o "porquê" de um padrão de React tem valor aqui.
- Estado do mês em foco é compartilhado entre páginas por `hooks/useMesSelecionado.ts`.
- Seleção múltipla (listas com exclusão em lote) por `hooks/useSelecao.ts`.

**Token e sessão**: `AuthContext` guarda o token no `localStorage`, então reload não desloga.
O backend usa **janela deslizante** — cada resposta autenticada pode trazer um token renovado
no header `X-Renewed-Token`, que o `api/client.ts` intercepta e salva. Esse header precisa
estar em `setExposedHeaders` no CORS do backend, senão o navegador impede o JS de lê-lo.

---

## 4. Componentes que valem conhecer

| Componente | Papel |
|---|---|
| `Modal.tsx` | Modal genérico usado por ~15 popups. Acessível (ver seção 6). Prop `largura` (default `max-w-md`) |
| `StatCard` / `EconomiaDestaque` | Cards de valor com fonte que encolhe até caber (`useAjustarFonte`) |
| `SeletorMes` / `SeletorData` / `GradeAnos` | Seletores próprios, substituem `<input type="month">` e `type="date"` nativos |
| `SeletorCategoria` | Lista **sempre aberta** com busca: 4 mais usadas + "Nova categoria", resto por rolagem |
| `AvisoCategoriaSemelhante` | Aviso **não-bloqueante** (bloco vermelho) de nome parecido |
| `ConfirmacaoModal` | Confirmações genéricas; a mensagem aceita `\n` (`whitespace-pre-line`) |
| `LeitorFaturaModal` | Upload → revisão → categorização em lote do CSV da fatura |
| `Tooltip` | Tooltip próprio — cobre hover **e** foco por teclado (`focus-within`) |
| `IconesInvestimento.tsx` | Ícones SVG à mão (editar, excluir, info, gráfico, lupa) — sem lib |
| `Avatar` | Foto ou iniciais; prop `menu` abre o popup de perfil |

`SimularDespesaModal.tsx` está **órfão** — o botão que o abria saiu da Home, mas o
componente continua no repo sem callers.

**`usePosicaoPopup`** posiciona os popups de mês/data via portal no `<body>`, com
`position: fixed`, para escapar do `overflow-y-auto` do card do `Modal` (que cortava o
calendário) e reposicionar quando não cabe na tela.

---

## 5. Regras de negócio que vivem no front

**Plano de contenção** (`utils/contencaoRendaVariavel.ts`, popup na Home) — só sugere corte
quando a renda **fixa** sozinha não cobriria as despesas do mês, ou seja, quando o mês só
fechou com ajuda da renda variável. A meta não é apenas "não fechar negativo": é sobrar ao
menos **10% da renda fixa**.

**Objetivos** (`utils/objetivos.ts`) — `planoObjetivo()` calcula progresso, meses restantes
(contando o mês atual) e o **aporte mensal** necessário. O rótulo "guarde R$ X/mês" aparece
na Home e no Planejamento, some quando a meta foi atingida ou não há renda fixa cadastrada.

**Resumo de despesas** (`utils/despesasResumo.ts`) — `mesEfetivoDespesa` implementa no front
o mesmo `COALESCE(mesReferencia, data)` do backend. "Maior alta" ignora categorias criadas no
mês atual e categorias sem gasto no mês anterior (comparar com zero não é alta real); "maior
baixa" só considera categorias que já tiveram gasto no mês atual.

**Busca por nome** (`utils/busca.ts`) — `normalizarBusca()` remove acento e caixa; a
comparação é `includes`, ou seja, trecho em qualquer posição (como um `LIKE %texto%`). Usada
pelas listas "Todas as despesas do mês" e "Todas as rendas do mês", ambas com uma lupa ao
lado do filtro "Todas" que abre o campo. Fechar limpa a busca — senão a lista ficaria
filtrada por um termo invisível.

**Forma de pagamento** (modal de despesa) — botões Débito/Crédito; o seletor de parcelas
(1x a 12x) só aparece no crédito, com prévia "3x de R$ 100,00". O valor digitado é o
**total**. Some quando a categoria é fixa, com aviso explicando (ver [BACKEND.md](BACKEND.md)
seção 5). O aviso de estouro de limite compara o teto com a **primeira parcela**, não com o
total — senão acusaria um estouro que não vai acontecer.

---

## 6. Acessibilidade

`Modal.tsx` foi o alvo de maior alavancagem: um componente reaproveitado por ~15 modais, então
melhorar ali corrige todos de uma vez. Tem `role="dialog"`, `aria-modal`, `aria-labelledby`
(via `useId()`), **gestão de foco** (guarda o elemento focado, move para o primeiro campo, e
devolve ao fechar), **focus trap** (Tab cicla só dentro; sai pelo Esc) e trava do scroll do
body.

**Decisão**: implementado à mão, sem `@radix-ui/react-dialog` ou `focus-trap-react` — o app já
tem um componente central para isso, e trocar por lib agora seria reescrever 15 callers por
ganho marginal. Se surgirem mais padrões de overlay (popover, combobox), vale reavaliar.

Também: **skip link** ("pular para o conteúdo") como primeiro elemento do `Layout`, visível
só no foco; `aria-label` em todo botão só-de-ícone; `focus:ring-2` em vez de `outline-none`
sem substituto; `<html lang="pt-BR">`.

**Checklist para código novo**: botão só com ícone → `aria-label` **e** `Tooltip` (não o
`title` nativo, cuja cor é controlada pelo SO e não é estilizável).

---

## 7. Responsividade

Breakpoints padrão do Tailwind (`sm` 640 / `md` 768 / `lg` 1024). Sem sistema de grid próprio.

**Sidebar → drawer** abaixo de `md`: `position: fixed` fora da tela até abrir, com barra
superior de hambúrguer, backdrop, fecha por Esc/backdrop/link, e `<main>` fica `inert`
enquanto aberto para o Tab não vazar. Em `md`+ as mesmas classes cancelam o drawer. Um único
componente com classes condicionais — dois componentes duplicariam toda futura mudança de menu.

**A técnica `contents lg:block`**, usada na Home, Movimentações e Planejamento: no mobile o
wrapper "some" da árvore de layout e os filhos viram itens soltos do flex externo, onde
`order-*` funciona; no desktop volta a ser bloco normal e `order` fica inerte. Isso evita
duplicar JSX (uma cópia mobile e outra desktop) e evita forçar CSS Grid a sincronizar a altura
de colunas independentes.

Consequência a lembrar: nesse modo, **título e avatar são irmãos no mesmo flex** — é o
`justify-between` do container que joga o avatar para o canto direito. Sem ele, os dois ficam
colados à esquerda (foi exatamente o bug de Movimentações).

**Home no mobile**: os 3 cards (Renda / Despesas / Economia) viram um seletor de 3 abas.
**Planejamento**: a altura fixa de viewport e o `grid-rows-2` só existem a partir de `lg` — no
mobile os blocos têm altura natural e a página inteira rola.

**Armadilha de `<select>` e itens de grid**: um `<select>` tem largura **intrínseca** — a da
option mais longa. Como item de grid/flex, sua `min-width` é `auto`, então ele não encolhe e
estoura o container em tela estreita, levando junto a lista que abre ancorada nele. Todo
select do app leva `min-w-0` (no campo e no wrapper), e os grids de dois campos são
`grid-cols-1 sm:grid-cols-2`. **A mesma regra vale para qualquer texto que possa crescer**:
`min-w-0` + `truncate` em vez de `shrink-0`.

**Placeholder é conteúdo, não estilo** — classe responsiva não o encurta. Para isso existe
`hooks/useTelaEstreita.ts` (`matchMedia`, casado com o `sm` do Tailwind), usado só nesse caso;
qualquer coisa que seja estilo continua melhor com `sm:`, que não custa re-render.

---

## 8. Build

`npm run dev` (5173) · `npm run build` (tsc + vite) · `npm run preview` · `npm run lint`.

**A porta do preview está fixada em 5173** no `vite.config.ts`. O padrão seria 4173, mas o
backend libera só a 5173 no CORS — na 4173 o preflight leva 403 e **toda** chamada à API falha.

**Só o build tem CSP**, injetada pelo plugin `cspNoBuild()`. Em dev ela não existe de
propósito (o dev server usa script inline e HMR, que a política bloquearia). Ou seja,
`npm run dev` **não serve** para testar a CSP — tem que ser o preview. Se algo quebrar só no
preview, abra o console e procure `Refused to ...`: a linha nomeia a diretiva que faltou, e o
conserto é acrescentar a origem em `politicaDeSeguranca`, no `vite.config.ts`.
