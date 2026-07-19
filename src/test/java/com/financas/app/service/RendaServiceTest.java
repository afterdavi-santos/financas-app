package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Renda;
import com.financas.app.model.Usuario;
import com.financas.app.repository.RendaRepository;
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
class RendaServiceTest {

    @Mock
    private RendaRepository rendaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    private RendaService rendaService;

    private static final LocalDate JULHO = LocalDate.of(2026, 7, 1);

    @BeforeEach
    void setUp() {
        rendaService = new RendaService(rendaRepository, usuarioRepository);
    }

    private Usuario usuarioComId(Long id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }

    private Renda rendaComId(Long rendaId, Long usuarioId, BigDecimal valor) {
        Renda renda = new Renda();
        renda.setId(rendaId);
        renda.setDescricao("Salário");
        renda.setValor(valor);
        renda.setMesReferencia(JULHO);
        renda.setUsuario(usuarioComId(usuarioId));
        return renda;
    }

    @Test
    void deveCriarRendaParaUsuarioExistente() {
        Renda nova = new Renda();
        nova.setValor(new BigDecimal("3000"));
        nova.setMesReferencia(JULHO);

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(rendaRepository.save(any(Renda.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Renda salva = rendaService.criar(1L, nova);

        assertThat(salva.getUsuario().getId()).isEqualTo(1L);
    }

    @Test
    void deveFalharAoCriarRendaParaUsuarioInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> rendaService.criar(99L, new Renda()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(rendaRepository, never()).save(any());
    }

    @Test
    void deveListarRendasDoUsuario() {
        when(rendaRepository.findByUsuarioId(1L)).thenReturn(List.of(rendaComId(1L, 1L, new BigDecimal("3000"))));

        List<Renda> rendas = rendaService.listarPorUsuario(1L);

        assertThat(rendas).hasSize(1);
    }

    @Test
    void deveAtualizarRendaDoProprioUsuario() {
        Renda existente = rendaComId(1L, 1L, new BigDecimal("3000"));
        Renda dadosAtualizados = new Renda();
        dadosAtualizados.setDescricao("Salário revisado");
        dadosAtualizados.setValor(new BigDecimal("3200"));
        dadosAtualizados.setMesReferencia(JULHO);

        when(rendaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(rendaRepository.save(any(Renda.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Renda atualizada = rendaService.atualizar(1L, 1L, dadosAtualizados);

        assertThat(atualizada.getDescricao()).isEqualTo("Salário revisado");
        assertThat(atualizada.getValor()).isEqualByComparingTo("3200");
    }

    @Test
    void deveFalharAoAtualizarRendaDeOutroUsuario() {
        Renda deOutroUsuario = rendaComId(1L, 2L, new BigDecimal("3000"));
        when(rendaRepository.findById(1L)).thenReturn(Optional.of(deOutroUsuario));

        assertThatThrownBy(() -> rendaService.atualizar(1L, 1L, new Renda()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(rendaRepository, never()).save(any());
    }

    @Test
    void deveExcluirRendaDoProprioUsuario() {
        Renda existente = rendaComId(1L, 1L, new BigDecimal("3000"));
        when(rendaRepository.findById(1L)).thenReturn(Optional.of(existente));

        rendaService.excluir(1L, 1L);

        verify(rendaRepository).delete(existente);
    }

    @Test
    void deveCalcularTotalDoMesSomandoMultiplasRendas() {
        Renda salario = rendaComId(1L, 1L, new BigDecimal("3000"));
        Renda freela = rendaComId(2L, 1L, new BigDecimal("500.50"));
        when(rendaRepository.findByUsuarioIdAndMesReferencia(1L, JULHO)).thenReturn(List.of(salario, freela));

        BigDecimal total = rendaService.calcularTotalMes(1L, JULHO);

        assertThat(total).isEqualByComparingTo("3500.50");
    }

}
