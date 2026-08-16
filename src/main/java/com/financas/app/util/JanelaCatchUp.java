package com.financas.app.util;

import java.time.LocalDate;

// Regra comum do catch-up de recorrência (DespesaService e RendaService): até
// que mês materializar as ocorrências de uma série, dado o mês que a tela está
// consultando. Fica aqui, e não duplicada nos dois serviços, pra que despesa
// fixa e renda fixa nunca divirjam em quanto adiantam.
public final class JanelaCatchUp {

    // Quanto o catch-up aceita adiantar em relação ao mês atual quando se
    // navega para o futuro no seletor de mês (1 ano é bem mais do que o
    // planejamento usual e limita quanta linha um passeio pelo seletor cria).
    public static final int MESES_FUTUROS_MAX = 12;

    private JanelaCatchUp() {
    }

    // Nunca recua para antes do mês atual (consultar um mês passado não pode
    // parar a série no passado) e nunca passa de MESES_FUTUROS_MAX à frente.
    // `ate` nulo = comportamento antigo, só até o mês corrente.
    public static LocalDate limiteDeGeracao(LocalDate ate) {
        LocalDate mesAtual = LocalDate.now().withDayOfMonth(1);
        if (ate == null) {
            return mesAtual;
        }
        LocalDate alvo = ate.withDayOfMonth(1);
        if (alvo.isBefore(mesAtual)) {
            return mesAtual;
        }
        LocalDate teto = mesAtual.plusMonths(MESES_FUTUROS_MAX);
        return alvo.isAfter(teto) ? teto : alvo;
    }

}
