package com.financas.app.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

// O relógio é ajustável de propósito: a janela deslizante só se prova
// empurrando o tempo para frente, e esperar 15 minutos de verdade num teste
// não é opção. Mesmo motivo do Clock injetado no JwtService.
class RateLimitLoginFilterTest {

    private static final int MAX_POR_EMAIL = 5;
    private static final int MAX_POR_IP = 20;
    private static final String IP = "203.0.113.10";

    private Instant agora;
    private RateLimitLoginFilter filtro;

    // Chain que finge o resultado do login: devolve o status pedido sem
    // encostar no banco.
    private static FilterChain chainRespondendo(int status) {
        return (req, res) -> ((HttpServletResponse) res).setStatus(status);
    }

    @BeforeEach
    void setUp() {
        agora = Instant.parse("2026-08-16T12:00:00Z");
        Clock relogio = new Clock() {
            @Override
            public ZoneId getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(ZoneId zone) {
                return this;
            }

            @Override
            public Instant instant() {
                return agora;
            }
        };
        // Jackson2ObjectMapperBuilder e não `new ObjectMapper()`: é o mesmo
        // caminho que o Spring Boot usa para montar o bean que o SecurityConfig
        // injeta, com o módulo de java.time registrado. Um mapper cru não
        // serializa o LocalDateTime do ErrorResponse e o 429 sairia quebrado —
        // testar com ele daria uma falsa reprovação.
        ObjectMapper objectMapper = Jackson2ObjectMapperBuilder.json().build();
        filtro = new RateLimitLoginFilter(relogio, objectMapper);
    }

    private void avancar(Duration duracao) {
        agora = agora.plus(duracao);
    }

    private MockHttpServletRequest login(String email, String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(ip);
        request.setContentType("application/json");
        request.setContent(("{\"email\":\"" + email + "\",\"senha\":\"errada\"}")
                .getBytes(StandardCharsets.UTF_8));
        return request;
    }

    private MockHttpServletResponse tentar(String email, String ip, int statusDoLogin) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filtro.doFilter(login(email, ip), response, chainRespondendo(statusDoLogin));
        return response;
    }

    private void falharVezes(int vezes, String email, String ip) throws Exception {
        for (int i = 0; i < vezes; i++) {
            assertThat(tentar(email, ip, 401).getStatus())
                    .as("tentativa %d ainda deveria passar pelo filtro", i + 1)
                    .isEqualTo(401);
        }
    }

    @Test
    void deveBloquearComRetryAfterAposEstourarLimitePorEmail() throws Exception {
        falharVezes(MAX_POR_EMAIL, "davi@exemplo.com", IP);

        MockHttpServletResponse bloqueada = tentar("davi@exemplo.com", IP, 401);

        assertThat(bloqueada.getStatus()).isEqualTo(429);
        // A primeira falha acabou de acontecer, então falta a janela inteira.
        assertThat(bloqueada.getHeader(HttpHeaders.RETRY_AFTER))
                .isEqualTo(String.valueOf(Duration.ofMinutes(15).toSeconds()));
        // O header vai em segundos (padrão HTTP), a frase vai em minutos
        // (o que a pessoa lê na tela de login).
        assertThat(bloqueada.getContentAsString())
                .contains("Muitas tentativas de login")
                .contains("15 minutos");
    }

    // O ponto da janela ser deslizante: ela não zera de uma vez na virada, vai
    // liberando vaga conforme cada falha completa 15 minutos.
    @Test
    void deveLiberarQuandoAFalhaMaisAntigaSaiDaJanela() throws Exception {
        falharVezes(MAX_POR_EMAIL, "davi@exemplo.com", IP);
        assertThat(tentar("davi@exemplo.com", IP, 401).getStatus()).isEqualTo(429);

        avancar(Duration.ofMinutes(15).plusSeconds(1));

        assertThat(tentar("davi@exemplo.com", IP, 401).getStatus())
                .as("passada a janela, a tentativa volta a chegar no login")
                .isEqualTo(401);
    }

    // Sem normalizar a caixa, alternar "Davi@" e "davi@" geraria uma chave nova
    // a cada tentativa e o limite por conta não valeria nada.
    @Test
    void deveContarOMesmoEmailIndependenteDaCaixa() throws Exception {
        for (int i = 0; i < MAX_POR_EMAIL; i++) {
            String email = i % 2 == 0 ? "Davi@Exemplo.com" : "davi@exemplo.com";
            assertThat(tentar(email, IP, 401).getStatus()).isEqualTo(401);
        }

        assertThat(tentar("DAVI@EXEMPLO.COM", IP, 401).getStatus()).isEqualTo(429);
    }

    // Ataque de senha comum contra muitas contas: cada e-mail leva uma
    // tentativa só, então nenhum estoura o limite por conta. Quem pega é o IP.
    @Test
    void deveBloquearPorIpMesmoComEmailSempreDiferente() throws Exception {
        for (int i = 0; i < MAX_POR_IP; i++) {
            assertThat(tentar("vitima" + i + "@exemplo.com", IP, 401).getStatus())
                    .as("nenhum e-mail sozinho chega perto do limite por conta")
                    .isEqualTo(401);
        }

        assertThat(tentar("vitima999@exemplo.com", IP, 401).getStatus()).isEqualTo(429);
    }

    @Test
    void naoDeveMisturarContagemDeIpsDiferentes() throws Exception {
        falharVezes(MAX_POR_EMAIL, "davi@exemplo.com", IP);
        assertThat(tentar("davi@exemplo.com", IP, 401).getStatus()).isEqualTo(429);

        // Outro IP, e-mail diferente: contagem própria, não herda o bloqueio.
        assertThat(tentar("outro@exemplo.com", "198.51.100.7", 401).getStatus()).isEqualTo(401);
    }

    @Test
    void deveZerarContagemDaContaAposLoginCerto() throws Exception {
        falharVezes(MAX_POR_EMAIL - 1, "davi@exemplo.com", IP);

        assertThat(tentar("davi@exemplo.com", IP, 200).getStatus()).isEqualTo(200);

        // Se o acerto não tivesse zerado, esta seria a 5ª falha e a seguinte
        // bloquearia; com o contador zerado, sobra folga.
        falharVezes(MAX_POR_EMAIL - 1, "davi@exemplo.com", IP);
        assertThat(tentar("davi@exemplo.com", IP, 401).getStatus()).isEqualTo(401);
    }

    // 400 é requisição malformada, não tentativa de adivinhar senha. Contar
    // isso deixaria alguém se auto-bloquear só mandando JSON torto.
    @Test
    void naoDeveContarRespostaDeValidacao() throws Exception {
        for (int i = 0; i < MAX_POR_EMAIL + 3; i++) {
            assertThat(tentar("davi@exemplo.com", IP, 400).getStatus()).isEqualTo(400);
        }
    }

    // O filtro lê o corpo para descobrir o e-mail. Sem o CorpoCacheadoRequest,
    // o stream chegaria consumido no controller e o login quebraria para todo
    // mundo — inclusive em quem digitou a senha certa.
    @Test
    void deveEntregarOCorpoIntactoAoRestanteDaCadeia() throws Exception {
        AtomicReference<String> corpoVisto = new AtomicReference<>();
        FilterChain chain = (req, res) -> {
            corpoVisto.set(new String(req.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
            ((HttpServletResponse) res).setStatus(200);
        };

        filtro.doFilter(login("davi@exemplo.com", IP), new MockHttpServletResponse(), chain);

        assertThat(corpoVisto.get()).isEqualTo("{\"email\":\"davi@exemplo.com\",\"senha\":\"errada\"}");
    }

    @Test
    void naoDeveInterferirEmOutrosCaminhos() throws Exception {
        MockHttpServletRequest outro = new MockHttpServletRequest("POST", "/api/auth/registrar");
        outro.setRemoteAddr(IP);
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < MAX_POR_IP + 5; i++) {
            response = new MockHttpServletResponse();
            filtro.doFilter(outro, response, chainRespondendo(401));
        }

        assertThat(response.getStatus()).isEqualTo(401);
    }

    // Corpo que não é JSON: o e-mail não sai, mas o limite por IP continua de
    // pé — senão bastaria mandar lixo junto para desligar a contagem.
    @Test
    void deveAplicarLimitePorIpMesmoComCorpoIlegivel() throws Exception {
        for (int i = 0; i < MAX_POR_IP; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr(IP);
            request.setContent("nao sou json".getBytes(StandardCharsets.UTF_8));
            filtro.doFilter(request, new MockHttpServletResponse(), chainRespondendo(401));
        }

        MockHttpServletRequest ultima = new MockHttpServletRequest("POST", "/api/auth/login");
        ultima.setRemoteAddr(IP);
        ultima.setContent("nao sou json".getBytes(StandardCharsets.UTF_8));
        MockHttpServletResponse response = new MockHttpServletResponse();
        filtro.doFilter(ultima, response, chainRespondendo(401));

        assertThat(response.getStatus()).isEqualTo(429);
    }

}
