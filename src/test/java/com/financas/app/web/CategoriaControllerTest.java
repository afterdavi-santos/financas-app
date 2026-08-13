package com.financas.app.web;

import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoCategoria;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.CategoriaService;
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

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CategoriaController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class CategoriaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CategoriaService categoriaService;

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
    void deveCriarCategoria() throws Exception {
        Categoria salva = new Categoria();
        salva.setId(10L);
        salva.setNome("Alimentação");
        salva.setTipo(TipoCategoria.VARIAVEL);
        when(categoriaService.criar(eq(1L), any(Categoria.class))).thenReturn(salva);

        mockMvc.perform(post("/api/categorias")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Alimentação","tipo":"VARIAVEL"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.nome").value("Alimentação"))
                .andExpect(jsonPath("$.tipo").value("VARIAVEL"));
    }

    @Test
    void deveRecusarCriacaoSemTipo() throws Exception {
        mockMvc.perform(post("/api/categorias")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Alimentação"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRecusarCriacaoDeCategoriaComMesmoNomeETipoJaExistente() throws Exception {
        when(categoriaService.criar(eq(1L), any(Categoria.class)))
                .thenThrow(new com.financas.app.exception.CategoriaJaExisteException());

        mockMvc.perform(post("/api/categorias")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Alimentação","tipo":"VARIAVEL"}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void deveListarCategoriasDoUsuarioAutenticado() throws Exception {
        Categoria categoria = new Categoria();
        categoria.setId(10L);
        categoria.setNome("Alimentação");
        categoria.setTipo(TipoCategoria.VARIAVEL);
        when(categoriaService.listarPorUsuario(1L)).thenReturn(List.of(categoria));
        when(categoriaService.contarDespesasPorCategoria(1L)).thenReturn(Map.of(10L, 7L));

        mockMvc.perform(get("/api/categorias")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].totalDespesas").value(7));
    }

    @Test
    void deveBuscarCategoriasSemelhantes() throws Exception {
        Categoria semelhante = new Categoria();
        semelhante.setId(20L);
        semelhante.setNome("Mercado");
        semelhante.setTipo(TipoCategoria.VARIAVEL);
        when(categoriaService.buscarSemelhantes(1L, "Mercadinho")).thenReturn(List.of(semelhante));

        mockMvc.perform(get("/api/categorias/semelhantes")
                        .param("nome", "Mercadinho")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(20))
                .andExpect(jsonPath("$[0].nome").value("Mercado"));
    }

    @Test
    void deveRecusarBuscaSemelhantesSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/categorias/semelhantes").param("nome", "Mercado"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deveRetornar404QuandoCategoriaNaoPertenceAoUsuario() throws Exception {
        org.mockito.Mockito.doThrow(new RecursoNaoEncontradoException("Categoria", 99L))
                .when(categoriaService).excluir(1L, 99L, false);

        mockMvc.perform(delete("/api/categorias/99")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveRecusarExclusaoDeCategoriaEmUsoSemCascata() throws Exception {
        org.mockito.Mockito.doThrow(new com.financas.app.exception.CategoriaEmUsoException())
                .when(categoriaService).excluir(1L, 10L, false);

        mockMvc.perform(delete("/api/categorias/10")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isConflict());
    }

    @Test
    void deveExcluirCategoriaEmUsoComCascataConfirmada() throws Exception {
        mockMvc.perform(delete("/api/categorias/10")
                        .param("cascata", "true")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNoContent());

        org.mockito.Mockito.verify(categoriaService).excluir(1L, 10L, true);
    }

    @Test
    void deveRecusarCriacaoSemNome() throws Exception {
        mockMvc.perform(post("/api/categorias")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/categorias"))
                .andExpect(status().isUnauthorized());
    }

}
