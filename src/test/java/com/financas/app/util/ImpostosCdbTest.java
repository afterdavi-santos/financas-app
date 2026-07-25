package com.financas.app.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImpostosCdbTest {

    @Test
    void iofComecaEm96PorCentoNoPrimeiroDia() {
        assertThat(ImpostosCdb.percentualIof(1)).isEqualByComparingTo("96");
    }

    @Test
    void iofNoMeioDaTabela() {
        assertThat(ImpostosCdb.percentualIof(15)).isEqualByComparingTo("50");
    }

    @Test
    void iofNoUltimoDiaComAliquota() {
        assertThat(ImpostosCdb.percentualIof(29)).isEqualByComparingTo("3");
    }

    @Test
    void iofZeraAPartirDoDia30() {
        assertThat(ImpostosCdb.percentualIof(30)).isEqualByComparingTo("0");
        assertThat(ImpostosCdb.percentualIof(31)).isEqualByComparingTo("0");
        assertThat(ImpostosCdb.percentualIof(365)).isEqualByComparingTo("0");
    }

    @Test
    void iofZeroParaDiaInvalido() {
        assertThat(ImpostosCdb.percentualIof(0)).isEqualByComparingTo("0");
    }

    @Test
    void irNaFaixaMaisAltaAteCentoOitentaDias() {
        assertThat(ImpostosCdb.percentualIr(1)).isEqualByComparingTo("22.5");
        assertThat(ImpostosCdb.percentualIr(180)).isEqualByComparingTo("22.5");
    }

    @Test
    void irNaSegundaFaixaDeCentoOitentaEUmATrezentosESessenta() {
        assertThat(ImpostosCdb.percentualIr(181)).isEqualByComparingTo("20");
        assertThat(ImpostosCdb.percentualIr(360)).isEqualByComparingTo("20");
    }

    @Test
    void irNaTerceiraFaixaDeTrezentosESessentaEUmASetecentosEVinte() {
        assertThat(ImpostosCdb.percentualIr(361)).isEqualByComparingTo("17.5");
        assertThat(ImpostosCdb.percentualIr(720)).isEqualByComparingTo("17.5");
    }

    @Test
    void irNaFaixaMinimaAcimaDeSetecentosEVinteDias() {
        assertThat(ImpostosCdb.percentualIr(721)).isEqualByComparingTo("15");
        assertThat(ImpostosCdb.percentualIr(3650)).isEqualByComparingTo("15");
    }

}
