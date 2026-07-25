package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Aporte;
import com.financas.app.model.Objetivo;
import com.financas.app.model.Usuario;
import com.financas.app.repository.AporteRepository;
import com.financas.app.repository.ObjetivoRepository;
import com.financas.app.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
    private AporteRepository aporteRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    private ObjetivoService objetivoService;

    @BeforeEach
    void setUp() {
        objetivoService = new ObjetivoService(objetivoRepository, aporteRepository, usuarioRepository);
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
    void deveAportarValorNoObjetivoESalvarOAporte() {
        Objetivo existente = objetivoComId(1L, 1L, new BigDecimal("1000"));
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(objetivoRepository.save(any(Objetivo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Objetivo atualizado = objetivoService.aportar(1L, 1L, new BigDecimal("250"), LocalDate.of(2026, 7, 24));

        assertThat(atualizado.getValorAtual()).isEqualByComparingTo("1250");
        verify(aporteRepository).save(any(Aporte.class));
    }

    @Test
    void deveUsarDataDeHojeQuandoAporteSemData() {
        Objetivo existente = objetivoComId(1L, 1L, BigDecimal.ZERO);
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(objetivoRepository.save(any(Objetivo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        objetivoService.aportar(1L, 1L, new BigDecimal("100"), null);

        ArgumentCaptor<Aporte> captor = ArgumentCaptor.forClass(Aporte.class);
        verify(aporteRepository).save(captor.capture());
        assertThat(captor.getValue().getData()).isEqualTo(LocalDate.now());
    }

    @Test
    void deveFalharAoAportarEmObjetivoDeOutroUsuario() {
        Objetivo deOutroUsuario = objetivoComId(1L, 2L, new BigDecimal("1000"));
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(deOutroUsuario));

        assertThatThrownBy(() -> objetivoService.aportar(1L, 1L, new BigDecimal("250"), null))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(objetivoRepository, never()).save(any());
    }

    @Test
    void deveListarAportesDoObjetivo() {
        Objetivo existente = objetivoComId(1L, 1L, new BigDecimal("300"));
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(aporteRepository.findByObjetivoIdOrderByDataAscIdAsc(1L))
                .thenReturn(List.of(aporteComId(10L, existente, new BigDecimal("300"))));

        List<Aporte> aportes = objetivoService.listarAportes(1L, 1L);

        assertThat(aportes).hasSize(1);
    }

    @Test
    void deveEditarAporteAjustandoValorAtualPeloDelta() {
        Objetivo existente = objetivoComId(1L, 1L, new BigDecimal("1000"));
        Aporte aporte = aporteComId(10L, existente, new BigDecimal("200"));
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(aporteRepository.findById(10L)).thenReturn(Optional.of(aporte));
        when(objetivoRepository.save(any(Objetivo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 200 -> 350 (delta +150): 1000 vira 1150.
        Objetivo atualizado = objetivoService.editarAporte(1L, 1L, 10L, new BigDecimal("350"), null);

        assertThat(atualizado.getValorAtual()).isEqualByComparingTo("1150");
        assertThat(aporte.getValor()).isEqualByComparingTo("350");
    }

    @Test
    void deveRemoverAporteSubtraindoDoValorAtual() {
        Objetivo existente = objetivoComId(1L, 1L, new BigDecimal("1000"));
        Aporte aporte = aporteComId(10L, existente, new BigDecimal("200"));
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(aporteRepository.findById(10L)).thenReturn(Optional.of(aporte));
        when(objetivoRepository.save(any(Objetivo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Objetivo atualizado = objetivoService.removerAporte(1L, 1L, 10L);

        assertThat(atualizado.getValorAtual()).isEqualByComparingTo("800");
        verify(aporteRepository).delete(aporte);
    }

    @Test
    void deveFalharAoEditarAporteDeOutroObjetivo() {
        Objetivo existente = objetivoComId(1L, 1L, new BigDecimal("1000"));
        Objetivo outro = objetivoComId(2L, 1L, BigDecimal.ZERO);
        Aporte aporteDeOutro = aporteComId(10L, outro, new BigDecimal("200"));
        when(objetivoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(aporteRepository.findById(10L)).thenReturn(Optional.of(aporteDeOutro));

        assertThatThrownBy(() -> objetivoService.editarAporte(1L, 1L, 10L, new BigDecimal("50"), null))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    private Aporte aporteComId(Long id, Objetivo objetivo, BigDecimal valor) {
        Aporte aporte = new Aporte();
        aporte.setId(id);
        aporte.setValor(valor);
        aporte.setData(LocalDate.of(2026, 7, 24));
        aporte.setObjetivo(objetivo);
        return aporte;
    }

}
