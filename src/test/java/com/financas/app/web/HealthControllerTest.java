package com.financas.app.web;

import com.financas.app.config.ClockConfig;
import com.financas.app.repository.UsuarioRepository;
import com.financas.app.security.JwtService;
import com.financas.app.security.SecurityConfig;
import com.financas.app.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * O que este teste protege é o DEPLOY, não uma regra de negócio.
 *
 * <p>O health check é chamado pela hospedagem sem credencial nenhuma, e um 401
 * é lido por ela como "serviço fora do ar" — o efeito seria o serviço reiniciando
 * em ciclo, com o app perfeitamente saudável. Como a rota depende de uma linha
 * de `permitAll` no SecurityConfig, e essa linha é fácil de derrubar sem querer
 * numa refatoração de segurança, ela precisa de um teste que grite.
 *
 * <p>Por isso a SecurityConfig REAL é importada: com a cadeia padrão do slice
 * (que nega tudo), o teste passaria sem provar nada sobre a configuração de
 * verdade.
 */
@WebMvcTest(controllers = HealthController.class)
@Import({SecurityConfig.class, ClockConfig.class})
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService usuarioService;

    // A cadeia de segurança real traz o JwtAuthenticationFilter junto, e ele
    // depende destes dois. Não são usados pelo teste — existem só para o
    // contexto do slice conseguir subir.
    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UsuarioRepository usuarioRepository;

    @Test
    void deveResponderSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }
}
