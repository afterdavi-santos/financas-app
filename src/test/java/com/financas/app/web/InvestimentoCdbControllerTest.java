package com.financas.app.web;

import com.financas.app.dto.InvestimentoCdbResponse;
import com.financas.app.dto.PosicaoCdbResponse;
import com.financas.app.dto.SimulacaoResgateResponse;
import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.exception.OperacaoInvalidaException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Usuario;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.InvestimentoCdbService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = InvestimentoCdbController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class InvestimentoCdbControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InvestimentoCdbService investimentoService;

    private UsernamePasswordAuthenticationToken autenticacao;

    @BeforeEach
    void setUp() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setEmail("davi@exemplo.com");
        UsuarioAutenticado usuarioAutenticado = new UsuarioAutenticado(usuario);
        autenticacao = new UsernamePasswordAuthenticationToken(
                usuarioAutenticado, null, usuarioAutenticado.getAuthorities());
    }

    private static InvestimentoCdbResponse investimento(Long id) {
        return new InvestimentoCdbResponse(id, "CDB Banco XP", new BigDecimal("1000.00"),
                new BigDecimal("100"), LocalDate.of(2026, 6, 1), null, null, null);
    }

    @Test
    void deveCriarInvestimento() throws Exception {
        when(investimentoService.criar(eq(1L), eq("CDB Banco XP"), eq(new BigDecimal("100")),
                eq(new BigDecimal("1000.00")), eq(LocalDate.of(2026, 6, 1))))
                .thenReturn(investimento(10L));

        mockMvc.perform(post("/api/investimentos-cdb")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"CDB Banco XP","valorAplicado":1000.00,"percentualCdi":100,"dataAplicacao":"2026-06-01"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void deveListarInvestimentosDoUsuarioAutenticado() throws Exception {
        when(investimentoService.listarPorUsuario(1L)).thenReturn(List.of(investimento(10L)));

        mockMvc.perform(get("/api/investimentos-cdb")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10));
    }

    @Test
    void deveConsultarPosicao() throws Exception {
        when(investimentoService.posicao(1L, 10L)).thenReturn(
                new PosicaoCdbResponse(new BigDecimal("1000.00"), new BigDecimal("1050.00"),
                        new BigDecimal("50.00"), 40, 28));

        mockMvc.perform(get("/api/investimentos-cdb/10/posicao")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorAtual").value(1050.00));
    }

    @Test
    void deveSimularResgate() throws Exception {
        when(investimentoService.simularResgate(eq(1L), eq(10L), eq(new BigDecimal("525.00")))).thenReturn(
                new SimulacaoResgateResponse(new BigDecimal("1050.00"), new BigDecimal("525.00"),
                        new BigDecimal("25.00"), 40, BigDecimal.ZERO, BigDecimal.ZERO,
                        new BigDecimal("22.5"), new BigDecimal("5.63"), new BigDecimal("519.37")));

        mockMvc.perform(post("/api/investimentos-cdb/10/simular-resgate")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valor":525.00}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorLiquido").value(519.37));
    }

    @Test
    void deveResgatar() throws Exception {
        when(investimentoService.resgatar(eq(1L), eq(10L), eq(new BigDecimal("1050.00")))).thenReturn(
                new SimulacaoResgateResponse(new BigDecimal("1050.00"), new BigDecimal("1050.00"),
                        new BigDecimal("50.00"), 40, BigDecimal.ZERO, BigDecimal.ZERO,
                        new BigDecimal("22.5"), new BigDecimal("11.25"), new BigDecimal("1038.75")));

        mockMvc.perform(post("/api/investimentos-cdb/10/resgatar")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valor":1050.00}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorLiquido").value(1038.75));
    }

    @Test
    void deveRecusarResgateAcimaDoValorAtual() throws Exception {
        when(investimentoService.resgatar(eq(1L), eq(10L), eq(new BigDecimal("9999.00"))))
                .thenThrow(new OperacaoInvalidaException("Saldo insuficiente para entregar esse valor líquido."));

        mockMvc.perform(post("/api/investimentos-cdb/10/resgatar")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valor":9999.00}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRetornar404AoExcluirInvestimentoDeOutroUsuario() throws Exception {
        org.mockito.Mockito.doThrow(new RecursoNaoEncontradoException("Investimento", 99L))
                .when(investimentoService).excluir(1L, 99L);

        mockMvc.perform(delete("/api/investimentos-cdb/99")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/investimentos-cdb"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deveInvestirMais() throws Exception {
        InvestimentoCdbResponse atualizado = new InvestimentoCdbResponse(10L, "CDB Banco XP",
                new BigDecimal("1250.00"), new BigDecimal("100"), LocalDate.of(2026, 6, 1), null, null, null);
        when(investimentoService.investirMais(eq(1L), eq(10L), eq(new BigDecimal("200.00")))).thenReturn(atualizado);

        mockMvc.perform(post("/api/investimentos-cdb/10/investir-mais")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valor":200.00}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorAplicado").value(1250.00));
    }

    @Test
    void deveSimularResgateTotal() throws Exception {
        when(investimentoService.simularResgateTotal(1L, 10L)).thenReturn(
                new SimulacaoResgateResponse(new BigDecimal("1050.00"), new BigDecimal("1050.00"),
                        new BigDecimal("50.00"), 40, BigDecimal.ZERO, BigDecimal.ZERO,
                        new BigDecimal("22.5"), new BigDecimal("11.25"), new BigDecimal("1038.75")));

        mockMvc.perform(post("/api/investimentos-cdb/10/simular-resgate-total")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorLiquido").value(1038.75));
    }

    @Test
    void deveResgatarTotal() throws Exception {
        when(investimentoService.resgatarTotal(1L, 10L)).thenReturn(
                new SimulacaoResgateResponse(new BigDecimal("1050.00"), new BigDecimal("1050.00"),
                        new BigDecimal("50.00"), 40, BigDecimal.ZERO, BigDecimal.ZERO,
                        new BigDecimal("22.5"), new BigDecimal("11.25"), new BigDecimal("1038.75")));

        mockMvc.perform(post("/api/investimentos-cdb/10/resgatar-total")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorLiquido").value(1038.75));
    }

}
