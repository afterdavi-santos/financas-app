package com.financas.app.web;

import com.financas.app.exception.CredenciaisInvalidasException;
import com.financas.app.exception.EmailJaCadastradoException;
import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.model.Usuario;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.JwtService;
import com.financas.app.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService usuarioService;

    @MockitoBean
    private JwtService jwtService;

    @Test
    void deveRegistrarUsuarioComSucesso() throws Exception {
        Usuario salvo = new Usuario();
        salvo.setId(1L);
        salvo.setNome("Davi");
        salvo.setEmail("davi@exemplo.com");
        when(usuarioService.cadastrar(any(Usuario.class))).thenReturn(salvo);

        mockMvc.perform(post("/api/auth/registrar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Davi","email":"davi@exemplo.com","senha":"senha123","aceitouTermos":true}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("davi@exemplo.com"))
                .andExpect(jsonPath("$.senha").doesNotExist());
    }

    @Test
    void deveRecusarRegistroComEmailInvalido() throws Exception {
        mockMvc.perform(post("/api/auth/registrar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Davi","email":"nao-e-email","senha":"senha123","aceitouTermos":true}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRecusarRegistroSemAceitarTermos() throws Exception {
        mockMvc.perform(post("/api/auth/registrar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Davi","email":"davi@exemplo.com","senha":"senha123","aceitouTermos":false}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRecusarRegistroComEmailJaCadastrado() throws Exception {
        when(usuarioService.cadastrar(any(Usuario.class))).thenThrow(new EmailJaCadastradoException("davi@exemplo.com"));

        mockMvc.perform(post("/api/auth/registrar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Davi","email":"davi@exemplo.com","senha":"senha123","aceitouTermos":true}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void deveFazerLoginERetornarToken() throws Exception {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setEmail("davi@exemplo.com");
        when(usuarioService.autenticar("davi@exemplo.com", "senha123")).thenReturn(usuario);
        when(jwtService.gerarToken(1L)).thenReturn("token-fake");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"davi@exemplo.com","senha":"senha123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token-fake"));
    }

    @Test
    void deveRecusarLoginComCredenciaisInvalidas() throws Exception {
        when(usuarioService.autenticar(anyString(), anyString())).thenThrow(new CredenciaisInvalidasException());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"davi@exemplo.com","senha":"errada"}
                                """))
                .andExpect(status().isUnauthorized());
    }

}
