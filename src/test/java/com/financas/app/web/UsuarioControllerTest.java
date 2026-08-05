package com.financas.app.web;

import com.financas.app.exception.EmailJaCadastradoException;
import com.financas.app.exception.FotoInvalidaException;
import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.exception.SenhaAtualInvalidaException;
import com.financas.app.model.Usuario;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.UsuarioService;
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

import java.util.Base64;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UsuarioController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class UsuarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService usuarioService;

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

    private Usuario usuarioSemFoto() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setNome("Davi");
        usuario.setEmail("davi@exemplo.com");
        return usuario;
    }

    @Test
    void deveRetornarPerfilSemFoto() throws Exception {
        when(usuarioService.buscarPorId(1L)).thenReturn(usuarioSemFoto());

        mockMvc.perform(get("/api/perfil/me")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.nome").value("Davi"))
                .andExpect(jsonPath("$.email").value("davi@exemplo.com"))
                .andExpect(jsonPath("$.fotoBase64").doesNotExist());
    }

    @Test
    void deveRetornarPerfilComFoto() throws Exception {
        Usuario usuario = usuarioSemFoto();
        usuario.setFoto(new byte[]{1, 2, 3});
        usuario.setFotoTipo("image/png");
        when(usuarioService.buscarPorId(1L)).thenReturn(usuario);

        mockMvc.perform(get("/api/perfil/me")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fotoBase64").value(
                        "data:image/png;base64," + Base64.getEncoder().encodeToString(new byte[]{1, 2, 3})));
    }

    @Test
    void deveRecusarMeSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/perfil/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deveAtualizarPerfil() throws Exception {
        Usuario atualizado = usuarioSemFoto();
        atualizado.setNome("Davi Novo");
        when(usuarioService.atualizarPerfil(eq(1L), eq("Davi Novo"), eq("novo@exemplo.com"), eq("senha123")))
                .thenReturn(atualizado);

        mockMvc.perform(put("/api/perfil")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Davi Novo","email":"novo@exemplo.com","senhaAtual":"senha123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Davi Novo"));
    }

    @Test
    void deveRecusarAtualizarPerfilSemEmailValido() throws Exception {
        mockMvc.perform(put("/api/perfil")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Davi Novo","email":"invalido","senhaAtual":"senha123"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRetornar401QuandoSenhaAtualInvalidaAoAtualizarPerfil() throws Exception {
        when(usuarioService.atualizarPerfil(eq(1L), any(), any(), eq("errada")))
                .thenThrow(new SenhaAtualInvalidaException());

        mockMvc.perform(put("/api/perfil")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Davi Novo","email":"novo@exemplo.com","senhaAtual":"errada"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deveRetornar409QuandoEmailJaCadastrado() throws Exception {
        when(usuarioService.atualizarPerfil(eq(1L), any(), eq("ocupado@exemplo.com"), any()))
                .thenThrow(new EmailJaCadastradoException("ocupado@exemplo.com"));

        mockMvc.perform(put("/api/perfil")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Davi Novo","email":"ocupado@exemplo.com","senhaAtual":"senha123"}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void deveAlterarSenha() throws Exception {
        mockMvc.perform(put("/api/perfil/senha")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"senhaAtual":"senha123","novaSenha":"novaSenha123"}
                                """))
                .andExpect(status().isNoContent());
    }

    @Test
    void deveRecusarNovaSenhaCurta() throws Exception {
        mockMvc.perform(put("/api/perfil/senha")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"senhaAtual":"senha123","novaSenha":"123"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveAtualizarFoto() throws Exception {
        Usuario atualizado = usuarioSemFoto();
        atualizado.setFoto(new byte[]{1, 2, 3});
        atualizado.setFotoTipo("image/png");
        when(usuarioService.atualizarFoto(eq(1L), any(), eq("image/png"))).thenReturn(atualizado);

        String base64 = Base64.getEncoder().encodeToString(new byte[]{1, 2, 3});
        mockMvc.perform(put("/api/perfil/foto")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fotoBase64\":\"" + base64 + "\",\"tipo\":\"image/png\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fotoBase64").exists());
    }

    @Test
    void deveRecusarFotoComTipoInvalido() throws Exception {
        when(usuarioService.atualizarFoto(eq(1L), any(), eq("image/gif")))
                .thenThrow(new FotoInvalidaException("Formato de imagem não suportado. Use PNG ou JPEG."));

        String base64 = Base64.getEncoder().encodeToString(new byte[]{1, 2, 3});
        mockMvc.perform(put("/api/perfil/foto")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fotoBase64\":\"" + base64 + "\",\"tipo\":\"image/gif\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRemoverFoto() throws Exception {
        when(usuarioService.removerFoto(1L)).thenReturn(usuarioSemFoto());

        mockMvc.perform(delete("/api/perfil/foto")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fotoBase64").doesNotExist());
    }

}
