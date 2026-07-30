package com.financas.app.web;

import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.model.CdiDiario;
import com.financas.app.model.Usuario;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.CdiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CdiController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class CdiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CdiService cdiService;

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
    void deveDevolverATaxaCdiMaisRecenteComAnualizacao() throws Exception {
        when(cdiService.taxaMaisRecente()).thenReturn(
                Optional.of(new CdiDiario(LocalDate.of(2026, 7, 23), new BigDecimal("0.052531"))));

        mockMvc.perform(get("/api/cdi/atual")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("2026-07-23"))
                .andExpect(jsonPath("$.taxaDiariaPercentual").value(0.052531))
                // (1 + 0.00052531)^252 - 1 ≈ 14,15% ao ano
                .andExpect(jsonPath("$.taxaAnualizadaPercentual").value(org.hamcrest.Matchers.closeTo(14.15, 0.05)));
    }

    @Test
    void deveDevolver404QuandoNaoHaTaxaCdiEmCache() throws Exception {
        when(cdiService.taxaMaisRecente()).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/cdi/atual")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/cdi/atual"))
                .andExpect(status().isUnauthorized());
    }

}
