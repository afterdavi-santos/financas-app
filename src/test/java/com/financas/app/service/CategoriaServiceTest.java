package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Usuario;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoriaServiceTest {

    @Mock
    private CategoriaRepository categoriaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    private CategoriaService categoriaService;

    @BeforeEach
    void setUp() {
        categoriaService = new CategoriaService(categoriaRepository, usuarioRepository);
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
        categoria.setUsuario(usuarioComId(usuarioId));
        return categoria;
    }

    @Test
    void deveCriarCategoriaParaUsuarioExistente() {
        Categoria categoria = new Categoria();
        categoria.setNome("Mercado");

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Categoria salva = categoriaService.criar(1L, categoria);

        assertThat(salva.getUsuario().getId()).isEqualTo(1L);
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

        when(categoriaRepository.findById(10L)).thenReturn(Optional.of(existente));
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Categoria atualizada = categoriaService.atualizar(1L, 10L, dadosAtualizados);

        assertThat(atualizada.getNome()).isEqualTo("Supermercado");
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

}
