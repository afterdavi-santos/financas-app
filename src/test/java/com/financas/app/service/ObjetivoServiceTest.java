package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Objetivo;
import com.financas.app.model.Usuario;
import com.financas.app.repository.ObjetivoRepository;
import com.financas.app.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ObjetivoServiceTest {

    @Mock
    private ObjetivoRepository objetivoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    private ObjetivoService objetivoService;

    @BeforeEach
    void setUp() {
        objetivoService = new ObjetivoService(objetivoRepository, usuarioRepository);
    }

    private Usuario usuarioComId(Long id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }

    private Objetivo objetivoComId(Long objetivoId, Long usuarioId, BigDecimal valorAtual) {
        Objetivo objetivo = new Objetivo();
        objetivo.setId(objetivoId);
        objetivo.setDescricao("Viagem");
        objetivo.setValorAlvo(new BigDecimal("5000"));
        objetivo.setValorAtual(valorAtual);
        objetivo.setDataAlvo(LocalDate.of(2027, 1, 1));
        objetivo.setUsuario(usuarioComId(usuarioId));
        return objetivo;
    }

    @Test
    void deveCriarObjetivoComValorAtualZeradoQuandoNaoInformado() {
        Objetivo novo = new Objetivo();
        novo.setDescricao("Viagem");
        novo.setValorAlvo(new BigDecimal("5000"));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(objetivoRepository.save(any(Objetivo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Objetivo salvo = objetivoService.criar(1L, novo);

        assertThat(salvo.getValorAtual()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(salvo.getUsuario().getId()).isEqualTo(1L);
    }

    @Test
    void deveFalharAoCriarObjetivoParaUsuarioInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> objetivoService.criar(99L, new Objetivo()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(objetivoRepository, never()).save(any());
    }

    @Test
    void deveListarObjetivosDoUsuario() {
        when(objetivoRepository.findByUsuarioId(1L)).thenReturn(List.of(objetivoComId(1L, 1L, BigDecimal.ZERO)));

        List<Objetivo> objetivos = objetivoService.listarPorUsuario(1L);

        assertThat(objetivos).hasSize(1);
    }

    @Test
    void deveAtualizarObjetivoDoProprioUsuario() {
        Objetivo existente = objetivoComId(1L, 1L, new BigDecimal("100"));
        Objetivo dadosAtualizados = new Objetivo();
        dadosAtualizados.setDescricao("Viagem revisada");
        dadosAtualizados.setValorAlvo(new BigDecimal("6000"));
        dadosAtualizados.setDataAlvo(LocalDate.of(2027, 6, 1));

        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(objetivoRepository.save(any(Objetivo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Objetivo atualizado = objetivoService.atualizar(1L, 1L, dadosAtualizados);

        assertThat(atualizado.getDescricao()).isEqualTo("Viagem revisada");
        assertThat(atualizado.getValorAlvo()).isEqualByComparingTo("6000");
        assertThat(atualizado.getValorAtual()).isEqualByComparingTo("100");
    }

    @Test
    void deveFalharAoAtualizarObjetivoDeOutroUsuario() {
        Objetivo deOutroUsuario = objetivoComId(1L, 2L, BigDecimal.ZERO);
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(deOutroUsuario));

        assertThatThrownBy(() -> objetivoService.atualizar(1L, 1L, new Objetivo()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(objetivoRepository, never()).save(any());
    }

    @Test
    void deveExcluirObjetivoDoProprioUsuario() {
        Objetivo existente = objetivoComId(1L, 1L, BigDecimal.ZERO);
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(existente));

        objetivoService.excluir(1L, 1L);

        verify(objetivoRepository).delete(existente);
    }

    @Test
    void deveAportarValorNoObjetivo() {
        Objetivo existente = objetivoComId(1L, 1L, new BigDecimal("1000"));
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(objetivoRepository.save(any(Objetivo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Objetivo atualizado = objetivoService.aportar(1L, 1L, new BigDecimal("250"));

        assertThat(atualizado.getValorAtual()).isEqualByComparingTo("1250");
    }

    @Test
    void deveFalharAoAportarEmObjetivoDeOutroUsuario() {
        Objetivo deOutroUsuario = objetivoComId(1L, 2L, new BigDecimal("1000"));
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(deOutroUsuario));

        assertThatThrownBy(() -> objetivoService.aportar(1L, 1L, new BigDecimal("250")))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(objetivoRepository, never()).save(any());
    }

}
