package com.financas.app.web;

import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoCategoria;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.DespesaService;
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

@WebMvcTest(controllers = DespesaController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class DespesaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DespesaService despesaService;

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

    private static Despesa despesa(Long id) {
        Categoria categoria = new Categoria();
        categoria.setId(5L);
        categoria.setNome("Alimentação");
        categoria.setTipo(TipoCategoria.VARIAVEL);

        Despesa despesa = new Despesa();
        despesa.setId(id);
        despesa.setDescricao("Mercado");
        despesa.setValor(new BigDecimal("150.00"));
        despesa.setData(LocalDate.of(2026, 7, 10));
        despesa.setCategoria(categoria);
        return despesa;
    }

    @Test
    void deveCriarDespesa() throws Exception {
        when(despesaService.criar(eq(1L), any(Despesa.class))).thenReturn(despesa(20L));

        mockMvc.perform(post("/api/despesas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Mercado","valor":150.00,"data":"2026-07-10","categoriaId":5}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(20))
                .andExpect(jsonPath("$.categoria.id").value(5))
                .andExpect(jsonPath("$.recorrente").value(false));
    }

    @Test
    void deveListarDespesasComFiltros() throws Exception {
        when(despesaService.listar(1L, 5L, TipoCategoria.VARIAVEL,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .thenReturn(List.of(despesa(20L)));

        mockMvc.perform(get("/api/despesas")
                        .param("categoriaId", "5")
                        .param("tipo", "VARIAVEL")
                        .param("inicio", "2026-07-01")
                        .param("fim", "2026-07-31")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(20));
    }

    @Test
    void deveCalcularTotalPorPeriodo() throws Exception {
        when(despesaService.calcularTotalPorPeriodo(1L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .thenReturn(new BigDecimal("300.00"));

        mockMvc.perform(get("/api/despesas/total")
                        .param("inicio", "2026-07-01")
                        .param("fim", "2026-07-31")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(300.00));
    }

    @Test
    void deveAtualizarDespesa() throws Exception {
        when(despesaService.atualizar(eq(1L), eq(20L), any(Despesa.class))).thenReturn(despesa(20L));

        mockMvc.perform(put("/api/despesas/20")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Mercado","valor":150.00,"data":"2026-07-10","categoriaId":5}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(20));
    }

    @Test
    void deveRetornar404AoExcluirDespesaDeOutroUsuario() throws Exception {
        org.mockito.Mockito.doThrow(new RecursoNaoEncontradoException("Despesa", 99L))
                .when(despesaService).excluir(1L, 99L);

        mockMvc.perform(delete("/api/despesas/99")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveRecusarCriacaoComValorNegativo() throws Exception {
        mockMvc.perform(post("/api/despesas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Mercado","valor":-10,"data":"2026-07-10","categoriaId":5}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/despesas"))
                .andExpect(status().isUnauthorized());
    }

}
