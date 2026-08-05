package com.financas.app.security;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

// Nota importante: o jjwt valida a claim `exp` contra o RELÓGIO REAL do
// sistema, não contra o Clock injetado aqui (esse só é usado na lógica de
// negócio de JwtService/JwtAuthenticationFilter — renovação e teto máximo).
// Por isso todo teste ancora os instantes em Instant.now() com offsets
// relativos, nunca em datas fixas do calendário — senão um token "emitido"
// com uma data fixa no passado chegaria com `exp` genuinamente expirado pro
// jjwt, independente do que este teste pretende simular.
class JwtServiceTest {

    private static final String SECRET =
            "***REMOVED***";
    private static final long EXPIRACAO_MS = 24 * 60 * 60 * 1000L; // 24h
    private static final long MAX_SESSAO_MS = 7 * 24 * 60 * 60 * 1000L; // 7 dias

    private JwtService servicoComClock(Instant agora) {
        return new JwtService(SECRET, EXPIRACAO_MS, MAX_SESSAO_MS, Clock.fixed(agora, ZoneOffset.UTC));
    }

    @Test
    void gerarTokenDeveConterUsuarioIdRecuperavel() {
        JwtService service = servicoComClock(Instant.now());

        String token = service.gerarToken(42L);

        assertThat(service.extrairUsuarioId(token)).isEqualTo(42L);
    }

    @Test
    void deveRenovarTokenDentroDoTetoMaximoMantendoSessaoInicio() {
        Instant inicio = Instant.now();
        JwtService servicoLogin = servicoComClock(inicio);
        String token = servicoLogin.gerarToken(42L);
        long sessaoInicio = servicoLogin.extrairSessaoInicio(token);

        // 23h depois: o token original já teria expirado sozinho às 24h, mas
        // como a pessoa usou o app, a renovação empurra a validade de novo.
        JwtService servicoDepois = servicoComClock(inicio.plus(23, ChronoUnit.HOURS));
        Optional<String> renovado = servicoDepois.renovarToken(42L, sessaoInicio);

        assertThat(renovado).isPresent();
        assertThat(servicoDepois.extrairUsuarioId(renovado.get())).isEqualTo(42L);
        assertThat(servicoDepois.extrairSessaoInicio(renovado.get())).isEqualTo(sessaoInicio);
    }

    @Test
    void naoDeveRenovarTokenAposTetoMaximoDeSessao() {
        // sessaoInicio simulado 8 dias no passado (relativo a agora) — não
        // precisa vir de um token de verdade pra este teste, `renovarToken`
        // recebe o valor direto.
        long sessaoInicio = Instant.now().minus(8, ChronoUnit.DAYS).toEpochMilli();
        JwtService servico = servicoComClock(Instant.now());

        assertThat(servico.renovarToken(42L, sessaoInicio)).isEmpty();
    }

    @Test
    void extrairSessaoInicioDeveSerIgualAoIssuedAtNaEmissaoOriginal() {
        Instant inicio = Instant.now();
        JwtService servico = servicoComClock(inicio);
        String token = servico.gerarToken(1L);

        assertThat(servico.extrairSessaoInicio(token)).isEqualTo(inicio.toEpochMilli());
    }

}
