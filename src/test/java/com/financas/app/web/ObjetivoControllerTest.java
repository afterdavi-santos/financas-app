package com.financas.app.web;

import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Aporte;
import com.financas.app.model.Objetivo;
import com.financas.app.model.Usuario;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.ObjetivoService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ObjetivoController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class ObjetivoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ObjetivoService objetivoService;

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

    private static Objetivo objetivo(Long id, BigDecimal valorAtual) {
        Objetivo objetivo = new Objetivo();
        objetivo.setId(id);
        objetivo.setDescricao("Viagem");
        objetivo.setValorAlvo(new BigDecimal("5000.00"));
        objetivo.setValorAtual(valorAtual);
        objetivo.setDataAlvo(LocalDate.of(2027, 1, 1));
        return objetivo;
    }

    @Test
    void deveCriarObjetivo() throws Exception {
        when(objetivoService.criar(eq(1L), any(Objetivo.class))).thenReturn(objetivo(40L, BigDecimal.ZERO));

        mockMvc.perform(post("/api/objetivos")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Viagem","valorAlvo":5000.00,"dataAlvo":"2027-01-01"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(40));
    }

    @Test
    void deveListarObjetivosDoUsuarioAutenticado() throws Exception {
        when(objetivoService.listarPorUsuario(1L)).thenReturn(List.of(objetivo(40L, BigDecimal.ZERO)));

        mockMvc.perform(get("/api/objetivos")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(40));
    }

    @Test
    void deveAportarNoObjetivo() throws Exception {
        when(objetivoService.aportar(eq(1L), eq(40L), eq(new BigDecimal("200.00")), any()))
                .thenReturn(objetivo(40L, new BigDecimal("200.00")));

        mockMvc.perform(post("/api/objetivos/40/aportar")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valor":200.00}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorAtual").value(200.00));
    }

    @Test
    void deveRetornar404AoExcluirObjetivoDeOutroUsuario() throws Exception {
        org.mockito.Mockito.doThrow(new RecursoNaoEncontradoException("Objetivo", 99L))
                .when(objetivoService).excluir(1L, 99L);

        mockMvc.perform(delete("/api/objetivos/99")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveRecusarAporteComValorNegativo() throws Exception {
        mockMvc.perform(post("/api/objetivos/40/aportar")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valor":-10}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/objetivos"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deveListarAportesDoObjetivo() throws Exception {
        Aporte aporte = new Aporte();
        aporte.setId(10L);
        aporte.setValor(new BigDecimal("200.00"));
        aporte.setData(LocalDate.of(2026, 7, 24));
        when(objetivoService.listarAportes(1L, 40L)).thenReturn(List.of(aporte));

        mockMvc.perform(get("/api/objetivos/40/aportes")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].valor").value(200.00))
                .andExpect(jsonPath("$[0].data").value("2026-07-24"));
    }

    @Test
    void deveEditarAporte() throws Exception {
        when(objetivoService.editarAporte(eq(1L), eq(40L), eq(10L), eq(new BigDecimal("350.00")), any()))
                .thenReturn(objetivo(40L, new BigDecimal("350.00")));

        mockMvc.perform(put("/api/objetivos/40/aportes/10")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valor":350.00,"data":"2026-07-24"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorAtual").value(350.00));
    }

    @Test
    void deveRemoverAporte() throws Exception {
        when(objetivoService.removerAporte(1L, 40L, 10L))
                .thenReturn(objetivo(40L, BigDecimal.ZERO));

        mockMvc.perform(delete("/api/objetivos/40/aportes/10")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorAtual").value(0));
    }

}
