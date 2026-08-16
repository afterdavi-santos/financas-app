package com.financas.app.security;

import com.financas.app.config.ClockConfig;
import com.financas.app.repository.UsuarioRepository;
import com.financas.app.service.UsuarioService;
import com.financas.app.web.AuthController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Os headers são escritos pela cadeia de filtros, antes de qualquer controller,
// então o alvo do teste é uma requisição barrada com 401: se o header aparece
// até na resposta que nem chegou no controller, ele aparece em todas.
@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, ClockConfig.class})
class SecurityHeadersTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService usuarioService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UsuarioRepository usuarioRepository;

    @Test
    void deveEnviarContentSecurityPolicyFechada() throws Exception {
        mockMvc.perform(get("/api/despesas"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Security-Policy",
                        "default-src 'none'; frame-ancestors 'none'; "
                                + "base-uri 'none'; form-action 'none'"));
    }

    @Test
    void deveEnviarReferrerPolicy() throws Exception {
        mockMvc.perform(get("/api/despesas"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"));
    }

    // HSTS só vale sobre HTTPS — o navegador descarta o header quando ele chega
    // por HTTP, e o writer padrão do Spring reflete isso. Daí o secure(true).
    @Test
    void deveEnviarHstsEmRequisicaoSegura() throws Exception {
        mockMvc.perform(get("/api/despesas").secure(true))
                .andExpect(header().string("Strict-Transport-Security",
                        "max-age=31536000 ; includeSubDomains"));
    }

    @Test
    void naoDeveEnviarHstsEmRequisicaoHttp() throws Exception {
        mockMvc.perform(get("/api/despesas"))
                .andExpect(header().doesNotExist("Strict-Transport-Security"));
    }

    // Os headers que já vinham antes do Bloco 4 continuam de pé: o bloco
    // .headers(...) acrescenta, não substitui.
    @Test
    void devePreservarOsDefaultsDoSpringSecurity() throws Exception {
        mockMvc.perform(get("/api/despesas"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }
}
