package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoDespesa;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.DespesaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

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
class DespesaServiceTest {

    @Mock
    private DespesaRepository despesaRepository;

    @Mock
    private CategoriaRepository categoriaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    private DespesaService despesaService;

    @BeforeEach
    void setUp() {
        despesaService = new DespesaService(despesaRepository, categoriaRepository, usuarioRepository);
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

    private Despesa despesaComId(Long despesaId, Long usuarioId, Long categoriaId, BigDecimal valor) {
        Despesa despesa = new Despesa();
        despesa.setId(despesaId);
        despesa.setDescricao("Mercado do mes");
        despesa.setValor(valor);
        despesa.setData(LocalDate.of(2026, 7, 10));
        despesa.setTipo(TipoDespesa.EXTRAORDINARIA);
        despesa.setUsuario(usuarioComId(usuarioId));
        despesa.setCategoria(categoriaDoUsuario(categoriaId, usuarioId));
        return despesa;
    }

    @Test
    void deveCriarDespesaComCategoriaDoUsuario() {
        Despesa nova = new Despesa();
        nova.setValor(new BigDecimal("50.00"));
        nova.setCategoria(categoriaDoUsuario(5L, 1L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa salva = despesaService.criar(1L, nova);

        assertThat(salva.getUsuario().getId()).isEqualTo(1L);
        assertThat(salva.getCategoria().getId()).isEqualTo(5L);
    }

    @Test
    void deveFalharAoCriarDespesaComCategoriaDeOutroUsuario() {
        Despesa nova = new Despesa();
        nova.setCategoria(categoriaDoUsuario(5L, 2L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 2L)));

        assertThatThrownBy(() -> despesaService.criar(1L, nova))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(despesaRepository, never()).save(any());
    }

    @Test
    void deveFalharAoCriarDespesaParaUsuarioInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> despesaService.criar(99L, new Despesa()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(despesaRepository, never()).save(any());
    }

    @Test
    void deveListarDespesasComFiltros() {
        Despesa despesa = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        when(despesaRepository.findAll(ArgumentMatchers.<Specification<Despesa>>any())).thenReturn(List.of(despesa));

        List<Despesa> resultado = despesaService.listar(1L, 5L, TipoDespesa.EXTRAORDINARIA,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));

        assertThat(resultado).containsExactly(despesa);
    }

    @Test
    void deveAtualizarDespesaDoProprioUsuario() {
        Despesa existente = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        Despesa dadosAtualizados = new Despesa();
        dadosAtualizados.setDescricao("Mercado atualizado");
        dadosAtualizados.setValor(new BigDecimal("150"));
        dadosAtualizados.setData(LocalDate.of(2026, 7, 15));
        dadosAtualizados.setTipo(TipoDespesa.FIXA);
        dadosAtualizados.setCategoria(categoriaDoUsuario(5L, 1L));

        when(despesaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa atualizada = despesaService.atualizar(1L, 1L, dadosAtualizados);

        assertThat(atualizada.getDescricao()).isEqualTo("Mercado atualizado");
        assertThat(atualizada.getValor()).isEqualByComparingTo("150");
    }

    @Test
    void deveFalharAoAtualizarDespesaDeOutroUsuario() {
        Despesa deOutroUsuario = despesaComId(1L, 2L, 5L, new BigDecimal("100"));
        when(despesaRepository.findById(1L)).thenReturn(Optional.of(deOutroUsuario));

        assertThatThrownBy(() -> despesaService.atualizar(1L, 1L, new Despesa()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(despesaRepository, never()).save(any());
    }

    @Test
    void deveExcluirDespesaDoProprioUsuario() {
        Despesa existente = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        when(despesaRepository.findById(1L)).thenReturn(Optional.of(existente));

        despesaService.excluir(1L, 1L);

        verify(despesaRepository).delete(existente);
    }

    @Test
    void deveCalcularTotalPorPeriodo() {
        Despesa despesa1 = despesaComId(1L, 1L, 5L, new BigDecimal("100.00"));
        Despesa despesa2 = despesaComId(2L, 1L, 5L, new BigDecimal("50.50"));
        when(despesaRepository.findAll(ArgumentMatchers.<Specification<Despesa>>any())).thenReturn(List.of(despesa1, despesa2));

        BigDecimal total = despesaService.calcularTotalPorPeriodo(1L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));

        assertThat(total).isEqualByComparingTo("150.50");
    }

    @Test
    void deveCalcularTotalPorCategoriaEPeriodo() {
        Despesa despesa1 = despesaComId(1L, 1L, 5L, new BigDecimal("100.00"));
        Despesa despesa2 = despesaComId(2L, 1L, 5L, new BigDecimal("50.50"));
        when(despesaRepository.findAll(ArgumentMatchers.<Specification<Despesa>>any())).thenReturn(List.of(despesa1, despesa2));

        BigDecimal total = despesaService.calcularTotalPorCategoriaEPeriodo(1L, 5L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));

        assertThat(total).isEqualByComparingTo("150.50");
    }

}
