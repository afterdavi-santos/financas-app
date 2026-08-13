// Par fundo+texto (usado onde a cor pinta o FUNDO inteiro de um elemento,
// não só uma borda fina — aí o texto precisa de contraste garantido).
export interface CorDificuldade {
  fundo: string;
  texto: string;
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

// Mesma escala de `corEscalaEconomia`, mas com a cor do texto pareada —
// usada no botão "Plano de contenção" (fundo inteiro pintado, não só uma
// borda). Antes esse botão usava uma escala própria baseada em "% da
// categoria variável selecionada que precisa ser cortada", que podia dar
// verde mesmo com a economia do mês negativa (bastava a categoria escolhida
// ser grande o suficiente pra um corte pequeno, em %, já cobrir o buraco).
// Trocado a pedido do usuário pra refletir a economia em si, igual à borda
// do card "Economia do mês".
export function corEscalaEconomiaBotao(percentual: number): CorDificuldade {
  const fundo = corEscalaEconomia(percentual);
  // Só o amarelo (#ECA000) precisa de texto escuro pra contraste; os outros
  // 4 tons da escala já são escuros/saturados o bastante pro texto branco.
  const texto = fundo === "#ECA000" ? "#102241" : "#FFFFFF";
  return { fundo, texto };
}

// Cor do badge de aviso de duplicata no Leitor de fatura, por nível de risco
// (ver DetectorDuplicidadeFatura no backend) — todos os 4 níveis (incluindo
// BLOCO) são "possível duplicata", então todos ficam em tons de vermelho
// (`grouper-red` #BA0000 como âncora), variando só a tonalidade conforme a
// confiança: mais escuro/saturado = mais certeza de que já existe.
export function corNivelDuplicata(nivel: "ALTISSIMA" | "ALTA" | "MEDIA" | "BLOCO"): CorDificuldade {
  if (nivel === "ALTISSIMA") return { fundo: "#8B0000", texto: "#FFFFFF" }; // vermelho mais escuro
  if (nivel === "ALTA") return { fundo: "#BA0000", texto: "#FFFFFF" }; // grouper-red
  if (nivel === "MEDIA") return { fundo: "#C6403A", texto: "#FFFFFF" }; // vermelho mais claro
  return { fundo: "#D97A75", texto: "#FFFFFF" }; // BLOCO — vermelho mais claro ainda
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
