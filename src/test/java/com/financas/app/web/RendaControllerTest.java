package com.financas.app.web;

import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Renda;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoRenda;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.RendaService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RendaController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class RendaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RendaService rendaService;

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

    private static Renda renda(Long id) {
        Renda renda = new Renda();
        renda.setId(id);
        renda.setDescricao("Salário");
        renda.setValor(new BigDecimal("3000.00"));
        renda.setMesReferencia(LocalDate.of(2026, 7, 1));
        renda.setTipo(TipoRenda.FIXA);
        return renda;
    }

    @Test
    void deveCriarRenda() throws Exception {
        when(rendaService.criar(eq(1L), any(Renda.class))).thenReturn(renda(30L));

        mockMvc.perform(post("/api/rendas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Salário","valor":3000.00,"mesReferencia":"2026-07-01","tipo":"FIXA"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(30))
                .andExpect(jsonPath("$.tipo").value("FIXA"))
                .andExpect(jsonPath("$.recorrente").value(false));
    }

    @Test
    void deveListarRendasDoUsuarioAutenticado() throws Exception {
        when(rendaService.listarPorUsuario(1L)).thenReturn(List.of(renda(30L)));

        mockMvc.perform(get("/api/rendas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(30));
    }

    @Test
    void deveCalcularTotalDoMes() throws Exception {
        when(rendaService.calcularTotalMes(1L, LocalDate.of(2026, 7, 1))).thenReturn(new BigDecimal("3000.00"));

        mockMvc.perform(get("/api/rendas/total")
                        .param("mesReferencia", "2026-07-01")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3000.00));
    }

    @Test
    void deveRetornar404AoExcluirRendaDeOutroUsuario() throws Exception {
        org.mockito.Mockito.doThrow(new RecursoNaoEncontradoException("Renda", 99L))
                .when(rendaService).excluir(1L, 99L);

        mockMvc.perform(delete("/api/rendas/99")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveRecusarCriacaoSemDescricao() throws Exception {
        mockMvc.perform(post("/api/rendas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"valor":3000.00,"mesReferencia":"2026-07-01"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/rendas"))
                .andExpect(status().isUnauthorized());
    }

}
