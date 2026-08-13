package com.financas.app.service;

import com.financas.app.exception.CategoriaEmUsoException;
import com.financas.app.exception.CategoriaJaExisteException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoCategoria;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.ContagemCategoria;
import com.financas.app.repository.DespesaRepository;
import com.financas.app.repository.LimiteCategoriaRepository;
import com.financas.app.repository.RecorrenciaDespesaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoriaServiceTest {

    @Mock
    private CategoriaRepository categoriaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private DespesaRepository despesaRepository;

    @Mock
    private LimiteCategoriaRepository limiteCategoriaRepository;

    @Mock
    private RecorrenciaDespesaRepository recorrenciaDespesaRepository;

    private CategoriaService categoriaService;

    @BeforeEach
    void setUp() {
        categoriaService = new CategoriaService(
                categoriaRepository, usuarioRepository, despesaRepository, limiteCategoriaRepository,
                recorrenciaDespesaRepository);
    }

    private Usuario usuarioComId(Long id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }

    private Categoria categoriaDoUsuario(Long categoriaId, Long usuarioId) {
        Categoria categoria = new Categoria();
        categoria.setId(categoriaId);
        categoria.setNome("Mercado");
        categoria.setTipo(TipoCategoria.VARIAVEL);
        categoria.setUsuario(usuarioComId(usuarioId));
        return categoria;
    }

    @Test
    void deveCriarCategoriaParaUsuarioExistente() {
        Categoria categoria = new Categoria();
        categoria.setNome("Mercado");
        categoria.setTipo(TipoCategoria.VARIAVEL);

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Categoria salva = categoriaService.criar(1L, categoria);

        assertThat(salva.getUsuario().getId()).isEqualTo(1L);
        assertThat(salva.getDataCriacao()).isNotNull();
    }

    @Test
    void deveFalharAoCriarCategoriaComMesmoNomeETipoJaExistente() {
        Categoria categoria = new Categoria();
        categoria.setNome("Mercado");
        categoria.setTipo(TipoCategoria.VARIAVEL);

        when(categoriaRepository.existsByNomeIgnoreCaseAndTipoAndUsuarioId("Mercado", TipoCategoria.VARIAVEL, 1L))
                .thenReturn(true);

        assertThatThrownBy(() -> categoriaService.criar(1L, categoria))
                .isInstanceOf(CategoriaJaExisteException.class);

        verify(categoriaRepository, never()).save(any());
    }

    @Test
    void devePermitirCriarCategoriaComMesmoNomeDeTipoDiferente() {
        Categoria categoria = new Categoria();
        categoria.setNome("Mercado");
        categoria.setTipo(TipoCategoria.FIXA);

        when(categoriaRepository.existsByNomeIgnoreCaseAndTipoAndUsuarioId("Mercado", TipoCategoria.FIXA, 1L))
                .thenReturn(false);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Categoria salva = categoriaService.criar(1L, categoria);

        assertThat(salva.getTipo()).isEqualTo(TipoCategoria.FIXA);
    }

    @Test
    void deveFalharAoCriarCategoriaParaUsuarioInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoriaService.criar(99L, new Categoria()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(categoriaRepository, never()).save(any());
    }

    @Test
    void deveListarCategoriasDoUsuario() {
        when(categoriaRepository.findByUsuarioId(1L)).thenReturn(List.of(categoriaDoUsuario(10L, 1L)));

        List<Categoria> categorias = categoriaService.listarPorUsuario(1L);

        assertThat(categorias).hasSize(1);
    }

    @Test
    void deveAtualizarCategoriaDoProprioUsuario() {
        Categoria existente = categoriaDoUsuario(10L, 1L);
        Categoria dadosAtualizados = new Categoria();
        dadosAtualizados.setNome("Supermercado");
        dadosAtualizados.setTipo(TipoCategoria.FIXA);

        when(categoriaRepository.findById(10L)).thenReturn(Optional.of(existente));
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Categoria atualizada = categoriaService.atualizar(1L, 10L, dadosAtualizados);

        assertThat(atualizada.getNome()).isEqualTo("Supermercado");
        assertThat(atualizada.getTipo()).isEqualTo(TipoCategoria.FIXA);
    }

    @Test
    void deveFalharAoAtualizarCategoriaParaNomeETipoJaUsadosPorOutra() {
        Categoria existente = categoriaDoUsuario(10L, 1L);
        Categoria dadosAtualizados = new Categoria();
        dadosAtualizados.setNome("Lazer");
        dadosAtualizados.setTipo(TipoCategoria.VARIAVEL);

        when(categoriaRepository.findById(10L)).thenReturn(Optional.of(existente));
        when(categoriaRepository.existsByNomeIgnoreCaseAndTipoAndUsuarioIdAndIdNot(
                "Lazer", TipoCategoria.VARIAVEL, 1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> categoriaService.atualizar(1L, 10L, dadosAtualizados))
                .isInstanceOf(CategoriaJaExisteException.class);

        verify(categoriaRepository, never()).save(any());
    }

    @Test
    void deveFalharAoAtualizarCategoriaDeOutroUsuario() {
        Categoria deOutroUsuario = categoriaDoUsuario(10L, 2L);

        when(categoriaRepository.findById(10L)).thenReturn(Optional.of(deOutroUsuario));

        assertThatThrownBy(() -> categoriaService.atualizar(1L, 10L, new Categoria()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(categoriaRepository, never()).save(any());
    }

    @Test
    void deveExcluirCategoriaDoProprioUsuario() {
        Categoria existente = categoriaDoUsuario(10L, 1L);
        when(categoriaRepository.findById(10L)).thenReturn(Optional.of(existente));

        categoriaService.excluir(1L, 10L);

        verify(categoriaRepository).delete(existente);
    }

    @Test
    void deveFalharAoExcluirCategoriaInexistente() {
        when(categoriaRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoriaService.excluir(1L, 10L))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deveFalharAoExcluirCategoriaComDespesaVinculada() {
        Categoria existente = categoriaDoUsuario(10L, 1L);
        when(categoriaRepository.findById(10L)).thenReturn(Optional.of(existente));
        when(despesaRepository.existsByCategoriaId(10L)).thenReturn(true);

        assertThatThrownBy(() -> categoriaService.excluir(1L, 10L))
                .isInstanceOf(CategoriaEmUsoException.class);

        verify(categoriaRepository, never()).delete(any());
    }

    @Test
    void deveFalharAoExcluirCategoriaComLimiteVinculado() {
        Categoria existente = categoriaDoUsuario(10L, 1L);
        when(categoriaRepository.findById(10L)).thenReturn(Optional.of(existente));
        when(limiteCategoriaRepository.existsByCategoriaId(10L)).thenReturn(true);

        assertThatThrownBy(() -> categoriaService.excluir(1L, 10L))
                .isInstanceOf(CategoriaEmUsoException.class);

        verify(categoriaRepository, never()).delete(any());
    }

    @Test
    void deveExcluirEmCascataCategoriaComDespesaVinculadaQuandoConfirmado() {
        Categoria existente = categoriaDoUsuario(10L, 1L);
        when(categoriaRepository.findById(10L)).thenReturn(Optional.of(existente));
        when(despesaRepository.existsByCategoriaId(10L)).thenReturn(true);

        categoriaService.excluir(1L, 10L, true);

        verify(despesaRepository).deleteByCategoriaId(10L);
        verify(recorrenciaDespesaRepository).deleteByCategoriaId(10L);
        verify(limiteCategoriaRepository).deleteByCategoriaId(10L);
        verify(categoriaRepository).delete(existente);
    }

    @Test
    void naoDeveApagarDespesasELimitesQuandoCategoriaNaoEstaEmUso() {
        Categoria existente = categoriaDoUsuario(10L, 1L);
        when(categoriaRepository.findById(10L)).thenReturn(Optional.of(existente));

        categoriaService.excluir(1L, 10L, true);

        verify(despesaRepository, never()).deleteByCategoriaId(any());
        verify(recorrenciaDespesaRepository, never()).deleteByCategoriaId(any());
        verify(limiteCategoriaRepository, never()).deleteByCategoriaId(any());
        verify(categoriaRepository).delete(existente);
    }

    @Test
    void deveBuscarCategoriasSemelhantes() {
        Categoria semelhante = categoriaDoUsuario(20L, 1L);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.buscarSemelhantes(eq(1L), eq("Mercadinho"), anyDouble()))
                .thenReturn(List.of(semelhante));

        List<Categoria> resultado = categoriaService.buscarSemelhantes(1L, "Mercadinho");

        assertThat(resultado).containsExactly(semelhante);
    }

    @Test
    void deveRetornarListaVaziaAoBuscarSemelhantesComNomeEmBranco() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));

        List<Categoria> resultado = categoriaService.buscarSemelhantes(1L, "   ");

        assertThat(resultado).isEmpty();
        verify(categoriaRepository, never()).buscarSemelhantes(any(), any(), anyDouble());
    }

    @Test
    void deveFalharAoBuscarSemelhantesParaUsuarioInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoriaService.buscarSemelhantes(99L, "Mercado"))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deveContarDespesasPorCategoria() {
        ContagemCategoria contagem = new ContagemCategoria() {
            public Long getCategoriaId() {
                return 10L;
            }

            public Long getTotal() {
                return 5L;
            }
        };
        when(despesaRepository.contarPorCategoria(1L)).thenReturn(List.of(contagem));

        Map<Long, Long> resultado = categoriaService.contarDespesasPorCategoria(1L);

        assertThat(resultado).containsEntry(10L, 5L);
    }

}
