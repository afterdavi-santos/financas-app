# Layout atual — Tela Home e Menu

> Documento de referência para discutir melhorias de design. Descreve **como está hoje**, não como deveria ficar. Sempre que pedir uma mudança de visual, você pode apontar para uma seção específica deste arquivo (ex: "quero mudar o card de Renda do mês" ou "o menu lateral deveria virar um menu superior").

## 1. Stack técnica

- **Framework:** React 19 + Vite + TypeScript
- **Estilo:** Tailwind CSS v4 (só classes utilitárias, sem tema customizado, sem biblioteca de componentes tipo MUI/Chakra)
- **Roteamento:** react-router-dom
- **Gráficos:** Recharts (usado só na página de Relatórios — a Home hoje não tem nenhum gráfico)

Arquivos principais:
| Arquivo | O que é |
|---|---|
| `frontend/src/components/Layout.tsx` | Casca da aplicação (menu + área de conteúdo) |
| `frontend/src/components/Sidebar.tsx` | Menu lateral |
| `frontend/src/pages/HomePage.tsx` | Tela Home |
| `frontend/src/components/StatCard.tsx` | Componente de card de estatística (reutilizado) |
| `frontend/src/components/PageHeader.tsx` | Cabeçalho padrão de outras páginas (Home tem o seu próprio, inline) |

## 2. Estrutura geral da tela

```
┌──────────────┬─────────────────────────────────────┐
│              │                                     │
│   Sidebar    │           Conteúdo (Home)            │
│   (240px)    │        fundo cinza claro             │
│   fundo      │        centralizado, largura         │
│   escuro     │        máxima ~896px                 │
│              │                                     │
└──────────────┴─────────────────────────────────────┘
```

- Layout em flex: sidebar fixa à esquerda + área principal ocupando o resto.
- Fundo da página: cinza claro (`slate-100`).
- **A sidebar não é responsiva**: não colapsa, não vira menu hambúrguer, não some no celular. Está sempre visível e ocupa sempre 240px.

## 3. Menu lateral (Sidebar)

Tipo: barra vertical fixa à esquerda, fundo escuro (`slate-900`), texto claro. Não é colapsável.

De cima para baixo:

1. **Bloco de marca** — texto "Finanças" em negrito, com uma linha separadora abaixo.
2. **Lista de navegação**, nesta ordem:
   1. Início
   2. Despesas
   3. Categorias
   4. Rendas
   5. Objetivos
   6. Limites
   7. Relatórios
   - Item ativo (página atual): fundo azul, texto branco.
   - Itens inativos: texto cinza claro, fica um pouco mais claro ao passar o mouse.
   - (O código já tem suporte para itens desabilitados/"em breve", mas hoje todos estão ativos.)
3. **Rodapé** — separado por uma linha, com o botão "Sair" ocupando a largura toda.

## 4. Tela Home — blocos de cima para baixo

Tudo empilhado verticalmente em uma única coluna centralizada (sem grid lateral, sem colunas paralelas — exceto os 3 cards de resumo, que ficam lado a lado).

### 4.1 Cabeçalho
- Título "Início" à esquerda.
- À direita, 4 botões de ação, nesta ordem:
  1. **+ Adicionar renda** (verde)
  2. **+ Adicionar despesa** (azul)
  3. **+ Adicionar categoria** (cinza claro)
  4. **Simular despesa** (cinza claro)

### 4.2 Banner de lembrete mensal *(aparece só uma vez por mês)*
- Faixa azul clara: "O mês virou! Deseja redefinir seus limites de despesas?"
- Botões: "Sim, redefinir" (leva para Limites) / "Agora não" (dispensa).

### 4.3 Banner de erro *(só se der erro ao carregar dados)*
- Faixa vermelha clara com o texto do erro.

### 4.4 Cards de resumo (3, lado a lado)
Em telas pequenas empilham verticalmente; a partir de telas médias ficam lado a lado.
1. **Renda do mês** — cor neutra
2. **Despesas do mês** — destaque vermelho
3. **Economia do mês** — verde se positiva, vermelho se negativa

Cada card: fundo branco, cantos arredondados, sombra leve. Rótulo pequeno em cima, valor grande embaixo (em R$). Sem ícones, sem mini-gráficos.

### 4.5 Seção "Plano de contenção"
- Card branco com título "Plano de contenção — [mês seguinte]".
- Conteúdo varia:
  - Se há necessidade de reduzir gastos: texto explicativo + lista de categorias com valor gasto e sugestão de corte (em vermelho); se ainda não for suficiente, aviso extra em amarelo.
  - Se não há necessidade: faixa verde de sucesso explicando que a renda fixa já cobre as despesas.
- Só texto e lista — sem gráfico.

### 4.6 Seção "Investimento CDB"
- Card branco. Cabeçalho com título + botão "+ Novo investimento" (roxo/indigo) à direita.
- Se vazio: texto "Nenhum investimento CDB ativo."
- Se tem investimentos:
  - Barra de seleção múltipla (aparece só quando algo está marcado): "N selecionados" + Cancelar/Excluir.
  - Checkbox "selecionar todos".
  - Lista de investimentos, cada linha com:
    - Checkbox
    - Descrição + selo indigo com "X% do CDI"
    - Data da aplicação
    - Se vinculado a um objetivo: texto azul "🔗 Vinculado ao objetivo '...'"
    - À direita: valor atual (destaque indigo) + botões de texto "Investir mais", "Resgatar", "Editar", "Excluir"
    - Abaixo: texto pequeno cinza "Rendeu R$X em Y dias úteis"

### 4.7 Seção "Últimas despesas"
- Card branco, título "Últimas despesas".
- Se vazio: "Nenhuma despesa lançada neste mês ainda."
- Lista das 3 despesas mais recentes: descrição + subtexto (categoria · tipo · data) à esquerda, valor em R$ à direita.

### 4.8 Modais (não aparecem por padrão)
Abrem por cima da tela ao clicar nos botões de ação: Nova Despesa, Nova Categoria, Nova Renda, Simular Despesa, Novo Investimento CDB, Resgatar CDB, Investir Mais.

## 5. Padrões visuais observados

| Elemento | Padrão |
|---|---|
| Paleta | Cinza-azulado (slate) para fundo/neutro; azul = ação principal; verde = positivo/renda; vermelho = negativo/despesa/exclusão; roxo/indigo = investimentos; amarelo = aviso |
| Cards | Fundo branco, cantos bem arredondados, sombra leve — igual em toda a Home |
| Botões | Cantos arredondados, cor sólida com tom mais escuro no hover |
| Espaçamento | Bastante espaço vertical entre seções; listas internas separadas por linhas finas (sem bordas em cada item) |
| Tipografia | Título da página grande e em negrito; títulos de seção médios; textos secundários pequenos e acinzentados |

## 6. Pontos que já pulam aos olhos como possíveis melhorias

*(observação neutra — não são decisões, só o que notei explorando o código)*

- A Home é 100% texto e listas empilhadas — **nenhum gráfico/visualização** aparece nela (os gráficos só existem na página de Relatórios).
- O menu lateral **não tem versão mobile** (não colapsa, não vira menu inferior/hambúrguer) — se algum dia você for usar em celular, isso vai doer.
- Muita informação empilhada em uma coluna só (cards + plano de contenção + CDB + despesas) — pode compensar organizar em grid/colunas para aproveitar telas largas.

## 7. Como pedir mudanças de design a partir de agora

Para deixar o processo mais rápido entre a gente, ao pedir uma mudança tente:

1. **Apontar a seção pelo nome deste doc** — ex: "na seção 4.6 (Investimento CDB), quero..." em vez de descrever tudo de novo.
2. **Dizer o "antes vs depois"** em uma frase — ex: "hoje é uma lista de texto, quero que vire cards com barra de progresso".
3. **Se for sobre cor/estilo geral**, dizer se é *só essa seção* ou *o padrão do app inteiro* (ex: mudar o azul de destaque em todo o sistema vs. só num botão).
4. Se quiser, me manda prints ou referências de layout que você gostou — ajuda bastante mesmo sem você saber o termo técnico certo.
5. Toda vez que o layout mudar de forma relevante, posso atualizar este arquivo para ele continuar batendo com a realidade — é só pedir "atualiza o doc de layout".
