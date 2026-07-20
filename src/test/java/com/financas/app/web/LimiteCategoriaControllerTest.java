package com.financas.app.web;

import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.model.Categoria;
import com.financas.app.model.LimiteCategoria;
import com.financas.app.model.Usuario;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.LimiteCategoriaService;
import com.financas.app.service.StatusLimiteCategoria;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LimiteCategoriaController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class LimiteCategoriaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LimiteCategoriaService limiteCategoriaService;

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

    private static LimiteCategoria limiteCategoria(Long id) {
        Categoria categoria = new Categoria();
        categoria.setId(5L);
        categoria.setNome("Alimentação");

        LimiteCategoria limite = new LimiteCategoria();
        limite.setId(id);
        limite.setValorLimite(new BigDecimal("500.00"));
        limite.setMesReferencia(LocalDate.of(2026, 7, 1));
        limite.setCategoria(categoria);
        return limite;
    }

    @Test
    void deveCriarLimiteCategoria() throws Exception {
        when(limiteCategoriaService.criar(eq(1L), any(LimiteCategoria.class))).thenReturn(limiteCategoria(50L));

        mockMvc.perform(post("/api/limites-categoria")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valorLimite":500.00,"mesReferencia":"2026-07-01","categoriaId":5}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(50))
                .andExpect(jsonPath("$.categoria.id").value(5));
    }

    @Test
    void deveListarLimitesPorMes() throws Exception {
        when(limiteCategoriaService.listarPorMes(1L, LocalDate.of(2026, 7, 1)))
                .thenReturn(List.of(limiteCategoria(50L)));

        mockMvc.perform(get("/api/limites-categoria")
                        .param("mesReferencia", "2026-07-01")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(50));
    }

    @Test
    void deveRetornarStatusDoLimite() throws Exception {
        when(limiteCategoriaService.verificarLimite(1L, 5L, LocalDate.of(2026, 7, 1)))
                .thenReturn(new StatusLimiteCategoria(new BigDecimal("500.00"), new BigDecimal("600.00"), true));

        mockMvc.perform(get("/api/limites-categoria/status")
                        .param("categoriaId", "5")
                        .param("mesReferencia", "2026-07-01")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estourado").value(true))
                .andExpect(jsonPath("$.valorGasto").value(600.00));
    }

    @Test
    void deveRecusarCriacaoComValorLimiteNegativo() throws Exception {
        mockMvc.perform(post("/api/limites-categoria")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valorLimite":-1,"mesReferencia":"2026-07-01","categoriaId":5}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/limites-categoria").param("mesReferencia", "2026-07-01"))
                .andExpect(status().isUnauthorized());
    }

}
