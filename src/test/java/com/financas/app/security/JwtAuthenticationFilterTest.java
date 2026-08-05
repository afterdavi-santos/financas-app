package com.financas.app.security;

import com.financas.app.model.Usuario;
import com.financas.app.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Ver nota em JwtServiceTest sobre por que os instantes usados aqui são
// sempre relativos a Instant.now() (real), nunca datas fixas do calendário —
// o jjwt valida `exp` contra o relógio real, não contra o Clock injetado.
@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    private static final String SECRET =
            "***REMOVED***";

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private FilterChain filterChain;

    private JwtService jwtService;
    private JwtAuthenticationFilter filtro;

    private JwtService jwtServiceComClock(Instant agora) {
        return new JwtService(SECRET, 86_400_000L, 604_800_000L, Clock.fixed(agora, ZoneOffset.UTC));
    }

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtService = jwtServiceComClock(Instant.now());
        filtro = new JwtAuthenticationFilter(jwtService, usuarioRepository);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void deveAutenticarERenovarTokenEmHeaderQuandoTokenValido() throws Exception {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        String token = jwtService.gerarToken(1L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filtro.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(response.getHeader(JwtAuthenticationFilter.HEADER_TOKEN_RENOVADO)).isNotNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void naoDeveAutenticarComTokenInvalido() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token-invalido");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filtro.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(response.getHeader(JwtAuthenticationFilter.HEADER_TOKEN_RENOVADO)).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void naoDeveAutenticarQuandoUsuarioNaoExisteMais() throws Exception {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.empty());
        String token = jwtService.gerarToken(1L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filtro.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(response.getHeader(JwtAuthenticationFilter.HEADER_TOKEN_RENOVADO)).isNull();
    }

    @Test
    void naoDeveRenovarTokenDeSessaoAlemDoTetoMaximoMasContinuaAutenticando() throws Exception {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));

        // Token real, recém-emitido (exp = agora + 24h — genuinamente válido
        // pro jjwt no momento em que este teste roda).
        String token = jwtService.gerarToken(1L);

        // Filtro "de 8 dias no futuro" — só afeta o cálculo interno do teto
        // máximo (agora - sessaoInicio); a validação real de exp do jjwt
        // continua usando o relógio real, e o token real ainda não expirou.
        JwtService jwtServiceOitoDiasDepois = jwtServiceComClock(Instant.now().plus(8, ChronoUnit.DAYS));
        JwtAuthenticationFilter filtroDepois = new JwtAuthenticationFilter(jwtServiceOitoDiasDepois, usuarioRepository);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filtroDepois.doFilterInternal(request, response, filterChain);

        // Token ainda válido -> autentica normalmente...
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        // ...mas passou do teto de 7 dias desde o login -> não renova.
        assertThat(response.getHeader(JwtAuthenticationFilter.HEADER_TOKEN_RENOVADO)).isNull();
    }

}
