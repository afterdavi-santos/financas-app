package com.financas.app.web;

import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.model.Usuario;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.RelatorioService;
import com.financas.app.service.ResumoMensal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RelatorioController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class RelatorioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RelatorioService relatorioService;

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

    @Test
    void deveRetornarEconomiaDoMes() throws Exception {
        when(relatorioService.calcularEconomiaDoMes(1L, LocalDate.of(2026, 7, 1)))
                .thenReturn(new BigDecimal("500.00"));

        mockMvc.perform(get("/api/relatorios/economia")
                        .param("mesReferencia", "2026-07-01")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(500.00));
    }

    @Test
    void deveCompararMeses() throws Exception {
        ResumoMensal resumo = new ResumoMensal(LocalDate.of(2026, 7, 1),
                new BigDecimal("3000.00"), new BigDecimal("2000.00"), new BigDecimal("1000.00"));
        when(relatorioService.compararMeses(1L, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 7, 1)))
                .thenReturn(List.of(resumo));

        mockMvc.perform(get("/api/relatorios/comparar-meses")
                        .param("inicio", "2026-06-01")
                        .param("fim", "2026-07-01")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].economia").value(1000.00));
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/relatorios/economia").param("mesReferencia", "2026-07-01"))
                .andExpect(status().isUnauthorized());
    }

}
