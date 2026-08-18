package com.financas.app.service;

import com.financas.app.exception.ResultadoExcessivoException;
import com.financas.app.model.Despesa;
import com.financas.app.model.Renda;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.DespesaRepository;
import com.financas.app.repository.RecorrenciaDespesaRepository;
import com.financas.app.repository.RecorrenciaRendaRepository;
import com.financas.app.repository.RendaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// MED-007 (CWE-770). O que estes testes provam, em uma frase: nenhuma listagem
// consegue materializar mais de TetoDeListagem.MAXIMO linhas, e quem estoura o
// teto recebe um erro em vez de um recorte silencioso.
//
// O ponto mais importante de cada teste do estouro e o
// `verify(..., never()).findAll(...)`: sem ele o teste passaria mesmo que o
// codigo carregasse tudo e so depois conferisse o tamanho — que e exatamente a
// implementacao que nao protege de nada.
@ExtendWith(MockitoExtension.class)
class TetoDeListagemTest {

    @Mock
    private DespesaRepository despesaRepository;
    @Mock
    private CategoriaRepository categoriaRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private RecorrenciaDespesaRepository recorrenciaDespesaRepository;
    @Mock
    private RendaRepository rendaRepository;
    @Mock
    private RecorrenciaRendaRepository recorrenciaRendaRepository;

    private DespesaService despesaService;
    private RendaService rendaService;

    @BeforeEach
    void setUp() {
        despesaService = new DespesaService(despesaRepository, categoriaRepository, usuarioRepository,
                recorrenciaDespesaRepository);
        rendaService = new RendaService(rendaRepository, usuarioRepository, recorrenciaRendaRepository);
    }

    @Test
    void deveRecusarListagemDeDespesasAcimaDoTeto() {
        when(despesaRepository.count(ArgumentMatchers.<Specification<Despesa>>any()))
                .thenReturn((long) TetoDeListagem.MAXIMO + 1);

        assertThatThrownBy(() -> despesaService.listar(1L, null, null,
                LocalDate.of(1, 1, 1), LocalDate.of(9999, 12, 31)))
                .isInstanceOf(ResultadoExcessivoException.class)
                .hasMessageContaining(String.valueOf(TetoDeListagem.MAXIMO));

        verify(despesaRepository, never()).findAll(ArgumentMatchers.<Specification<Despesa>>any());
    }

    @Test
    void deveAceitarListagemDeDespesasExatamenteNoTeto() {
        when(despesaRepository.count(ArgumentMatchers.<Specification<Despesa>>any()))
                .thenReturn((long) TetoDeListagem.MAXIMO);
        when(despesaRepository.findAll(ArgumentMatchers.<Specification<Despesa>>any()))
                .thenReturn(List.of());

        assertThatCode(() -> despesaService.listar(1L, null, null, null, null))
                .doesNotThrowAnyException();
    }

    @Test
    void deveRecusarBuscaDeDuplicatasAcimaDoTeto() {
        when(despesaRepository.count(ArgumentMatchers.<Specification<Despesa>>any()))
                .thenReturn((long) TetoDeListagem.MAXIMO + 1);

        assertThatThrownBy(() -> despesaService.listarPorDataReal(1L,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31)))
                .isInstanceOf(ResultadoExcessivoException.class);

        verify(despesaRepository, never()).findAll(ArgumentMatchers.<Specification<Despesa>>any());
    }

    @Test
    void deveRecusarListagemDeRendasAcimaDoTeto() {
        when(rendaRepository.countByUsuarioIdAndMesReferenciaBetween(eq(1L), any(), any()))
                .thenReturn((long) TetoDeListagem.MAXIMO + 1);

        assertThatThrownBy(() -> rendaService.listarPorUsuario(1L, null, null))
                .isInstanceOf(ResultadoExcessivoException.class);

        verify(rendaRepository, never()).findByUsuarioIdAndMesReferenciaBetween(any(), any(), any());
    }

    // Sem periodo a listagem de rendas nao volta a ser irrestrita: ela vira um
    // BETWEEN entre as sentinelas, e o teto continua sendo conferido. Este teste
    // fixa isso porque o caminho "sem filtro" e justamente o que estava aberto
    // antes do MED-007.
    @Test
    void deveConsultarRendasPorIntervaloMesmoSemFiltro() {
        rendaService.listarPorUsuario(1L, null, null);

        verify(rendaRepository).countByUsuarioIdAndMesReferenciaBetween(eq(1L),
                eq(LocalDate.of(1, 1, 1)), eq(LocalDate.of(9999, 12, 31)));
        verify(rendaRepository).findByUsuarioIdAndMesReferenciaBetween(eq(1L),
                eq(LocalDate.of(1, 1, 1)), eq(LocalDate.of(9999, 12, 31)));
    }

    // O filtro precisa chegar ao banco, nao ser aplicado depois de carregar:
    // filtrar em memoria devolveria a lista certa e ainda assim leria a tabela
    // inteira, que e o problema que o MED-007 descreve.
    @Test
    void devePassarOIntervaloPedidoParaOBanco() {
        LocalDate inicio = LocalDate.of(2026, 3, 1);
        LocalDate fim = LocalDate.of(2026, 8, 1);
        Renda renda = new Renda();
        when(rendaRepository.findByUsuarioIdAndMesReferenciaBetween(1L, inicio, fim))
                .thenReturn(List.of(renda));

        List<Renda> resultado = rendaService.listarPorUsuario(1L, inicio, fim);

        assertThat(resultado).containsExactly(renda);
        verify(rendaRepository).countByUsuarioIdAndMesReferenciaBetween(1L, inicio, fim);
    }

}
