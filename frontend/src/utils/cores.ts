// Escala verde → amarelo → laranja → vermelho usada só para sinalizar
// dificuldade/urgência (ex.: botão do Plano de contenção) — exceção
// deliberada à paleta do brandbook (que normalmente não usa essas cores),
// reservada para esse tipo de alerta, assim como o preto já é reservado
// para alarme real em outras partes da Home.
//
// As cores vêm das paletas vermelho→amarelo e verde→amarelo em
// `frontend/public/brand/palettes/` (não são mais tons genéricos do
// Tailwind).
//
// Faixas por degraus (não é um degradê contínuo): baseadas no percentual de
// `dificuldadeContencao` (0 a 1) — quanto das despesas extraordinárias
// selecionadas precisa ser cortado para fechar o próximo mês.
//   até 40%   → verde   (tranquilo)
//   40 a 70%  → amarelo (atenção)
//   70 a 90%  → laranja (alerta)
//   acima de 90% → vermelho (crítico — mal dá pra cortar mais que isso)
export interface CorDificuldade {
  fundo: string;
  texto: string;
}

export function corEscalaDificuldade(percentual: number): CorDificuldade {
  if (percentual > 0.9) return { fundo: "#BA0000", texto: "#FFFFFF" }; // vermelho
  if (percentual > 0.7) return { fundo: "#D96000", texto: "#FFFFFF" }; // laranja
  if (percentual > 0.4) return { fundo: "#ECA000", texto: "#102241" }; // amarelo
  return { fundo: "#005E2F", texto: "#FFFFFF" }; // verde
}

// Escala vermelho → amarelo → verde para a borda do card "Economia do mês":
// quanto mais perto de zero (ou negativa) a economia estiver em relação à
// renda do mês, mais vermelha a borda; quanto mais longe de zero (maior
// sobra), mais verde. 5 degraus de 20% (2 vermelhos, 1 amarelo, 2 verdes),
// cores tiradas das paletas em `frontend/public/brand/palettes/`.
// `percentual` = economia / renda * 100, já limitado a 0–100 por quem chama.
export function corEscalaEconomia(percentual: number): string {
  if (percentual < 20) return "#BA0000"; // vermelho — quase zerada ou negativa
  if (percentual < 40) return "#D96000"; // vermelho/laranja
  if (percentual < 60) return "#ECA000"; // amarelo
  if (percentual < 80) return "#568E3F"; // verde claro
  return "#005E2F"; // verde escuro — bem longe de zero
}

// Escala de azuis do brandbook (claro → escuro) para a barra de progresso dos
// Objetivos: quanto menor o percentual, mais claro; quanto maior, mais
// escuro. Mesmos 5 tons de `--color-grouper-*` em `index.css` (vindos do
// brandbook.pptx), em degraus de 20%. `percentual` vem em escala 0–100.
export function corEscalaProgresso(percentual: number): string {
  if (percentual < 20) return "#86C3EB"; // grouper-sky
  if (percentual < 40) return "#5399CD"; // grouper-mid
  if (percentual < 60) return "#244C7E"; // grouper-deep
  if (percentual < 80) return "#1C4562"; // grouper-navy
  return "#102241"; // grouper-ink — perto ou batendo a meta
}
