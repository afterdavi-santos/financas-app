package com.financas.app.service;

import com.financas.app.exception.LimiteJaExisteException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.LimiteCategoria;
import com.financas.app.model.Usuario;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.LimiteCategoriaRepository;
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
class LimiteCategoriaServiceTest {

    @Mock
    private LimiteCategoriaRepository limiteCategoriaRepository;

    @Mock
    private CategoriaRepository categoriaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private DespesaService despesaService;

    private LimiteCategoriaService limiteCategoriaService;

    private static final LocalDate JULHO = LocalDate.of(2026, 7, 1);

    @BeforeEach
    void setUp() {
        limiteCategoriaService = new LimiteCategoriaService(limiteCategoriaRepository, categoriaRepository,
                usuarioRepository, despesaService);
    }

    private Usuario usuarioComId(Long id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }

    private Categoria categoriaDoUsuario(Long categoriaId, Long usuarioId) {
        Categoria categoria = new Categoria();
        categoria.setId(categoriaId);
        categoria.setUsuario(usuarioComId(usuarioId));
        return categoria;
    }

    private LimiteCategoria limiteComId(Long limiteId, Long usuarioId, Long categoriaId, BigDecimal valorLimite) {
        LimiteCategoria limite = new LimiteCategoria();
        limite.setId(limiteId);
        limite.setValorLimite(valorLimite);
        limite.setUsuario(usuarioComId(usuarioId));
        limite.setCategoria(categoriaDoUsuario(categoriaId, usuarioId));
        return limite;
    }

    @Test
    void deveCriarLimiteParaCategoriaDoUsuario() {
        LimiteCategoria novo = new LimiteCategoria();
        novo.setValorLimite(new BigDecimal("500"));
        novo.setCategoria(categoriaDoUsuario(5L, 1L));

        when(limiteCategoriaRepository.findByUsuarioIdAndCategoriaId(1L, 5L)).thenReturn(Optional.empty());
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(limiteCategoriaRepository.save(any(LimiteCategoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LimiteCategoria salvo = limiteCategoriaService.criar(1L, novo);

        assertThat(salvo.getUsuario().getId()).isEqualTo(1L);
        assertThat(salvo.getCategoria().getId()).isEqualTo(5L);
    }

    @Test
    void deveFalharAoCriarLimiteDuplicadoNaCategoria() {
        LimiteCategoria novo = new LimiteCategoria();
        novo.setValorLimite(new BigDecimal("500"));
        novo.setCategoria(categoriaDoUsuario(5L, 1L));

        when(limiteCategoriaRepository.findByUsuarioIdAndCategoriaId(1L, 5L))
                .thenReturn(Optional.of(limiteComId(9L, 1L, 5L, new BigDecimal("300"))));

        assertThatThrownBy(() -> limiteCategoriaService.criar(1L, novo))
                .isInstanceOf(LimiteJaExisteException.class);

        verify(limiteCategoriaRepository, never()).save(any());
    }

    @Test
    void deveFalharAoCriarLimiteComCategoriaDeOutroUsuario() {
        LimiteCategoria novo = new LimiteCategoria();
        novo.setCategoria(categoriaDoUsuario(5L, 2L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 2L)));

        assertThatThrownBy(() -> limiteCategoriaService.criar(1L, novo))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(limiteCategoriaRepository, never()).save(any());
    }

    @Test
    void deveListarLimites() {
        when(limiteCategoriaRepository.findByUsuarioId(1L))
                .thenReturn(List.of(limiteComId(1L, 1L, 5L, new BigDecimal("500"))));

        List<LimiteCategoria> limites = limiteCategoriaService.listar(1L);

        assertThat(limites).hasSize(1);
    }

    @Test
    void deveAtualizarLimiteDoProprioUsuario() {
        LimiteCategoria existente = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        LimiteCategoria dadosAtualizados = new LimiteCategoria();
        dadosAtualizados.setValorLimite(new BigDecimal("700"));

        when(limiteCategoriaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(limiteCategoriaRepository.save(any(LimiteCategoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LimiteCategoria atualizado = limiteCategoriaService.atualizar(1L, 1L, dadosAtualizados);

        assertThat(atualizado.getValorLimite()).isEqualByComparingTo("700");
    }

    @Test
    void deveFalharAoAtualizarLimiteDeOutroUsuario() {
        LimiteCategoria deOutroUsuario = limiteComId(1L, 2L, 5L, new BigDecimal("500"));
        when(limiteCategoriaRepository.findById(1L)).thenReturn(Optional.of(deOutroUsuario));

        assertThatThrownBy(() -> limiteCategoriaService.atualizar(1L, 1L, new LimiteCategoria()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(limiteCategoriaRepository, never()).save(any());
    }

    @Test
    void deveExcluirLimiteDoProprioUsuario() {
        LimiteCategoria existente = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        when(limiteCategoriaRepository.findById(1L)).thenReturn(Optional.of(existente));

        limiteCategoriaService.excluir(1L, 1L);

        verify(limiteCategoriaRepository).delete(existente);
    }

    @Test
    void deveVerificarLimiteNaoEstourado() {
        LimiteCategoria limite = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        when(limiteCategoriaRepository.findByUsuarioIdAndCategoriaId(1L, 5L))
                .thenReturn(Optional.of(limite));
        when(despesaService.calcularTotalPorCategoriaEPeriodo(1L, 5L, JULHO, JULHO.withDayOfMonth(31)))
                .thenReturn(new BigDecimal("300"));

        StatusLimiteCategoria status = limiteCategoriaService.verificarLimite(1L, 5L, JULHO);

        assertThat(status.estourado()).isFalse();
        assertThat(status.valorGasto()).isEqualByComparingTo("300");
    }

    @Test
    void deveVerificarLimiteEstourado() {
        LimiteCategoria limite = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        when(limiteCategoriaRepository.findByUsuarioIdAndCategoriaId(1L, 5L))
                .thenReturn(Optional.of(limite));
        when(despesaService.calcularTotalPorCategoriaEPeriodo(1L, 5L, JULHO, JULHO.withDayOfMonth(31)))
                .thenReturn(new BigDecimal("600"));

        StatusLimiteCategoria status = limiteCategoriaService.verificarLimite(1L, 5L, JULHO);

        assertThat(status.estourado()).isTrue();
    }

    @Test
    void deveFalharAoVerificarLimiteInexistente() {
        when(limiteCategoriaRepository.findByUsuarioIdAndCategoriaId(1L, 5L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> limiteCategoriaService.verificarLimite(1L, 5L, JULHO))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

}
