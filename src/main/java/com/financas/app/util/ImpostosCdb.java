package com.financas.app.util;

import java.math.BigDecimal;

// Tabelas oficiais de tributação de renda fixa no Brasil (Decreto 6.306/2007
// para IOF regressivo; Lei 11.033/2004 para IR regressivo). Funções puras,
// só dependem dos dias corridos entre aplicação e resgate.
public final class ImpostosCdb {

    private ImpostosCdb() {
    }

    // IOF regressivo: incide só sobre resgates feitos nos primeiros 30 dias
    // corridos. Dia 1 = 96%, caindo até 0% no dia 30. Tabela fixa (Anexo do
    // Decreto 6.306/2007), não muda com o tempo.
    private static final int[] TABELA_IOF = {
            96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
            63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
            30, 26, 23, 20, 16, 13, 10, 6, 3, 0,
    };

    // Percentual de IOF (0-96) para um resgate feito após `diasCorridos` dias
    // desde a aplicação. Após o dia 30, não há mais IOF.
    public static BigDecimal percentualIof(long diasCorridos) {
        if (diasCorridos >= 30 || diasCorridos < 1) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(TABELA_IOF[(int) diasCorridos - 1]);
    }

    // IR regressivo (renda fixa): quanto mais tempo aplicado, menor a alíquota.
    public static BigDecimal percentualIr(long diasCorridos) {
        if (diasCorridos <= 180) {
            return new BigDecimal("22.5");
        }
        if (diasCorridos <= 360) {
            return new BigDecimal("20");
        }
        if (diasCorridos <= 720) {
            return new BigDecimal("17.5");
        }
        return new BigDecimal("15");
    }

}
