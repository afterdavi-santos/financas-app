package com.financas.app.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Clock;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;

// Sessão com janela deslizante: cada requisição autenticada reemite um token
// novo com +expiracaoMs de validade (ver JwtAuthenticationFilter), então a
// pessoa só é desconectada se ficar esse tempo (24h) sem usar o app. A claim
// própria `sessaoInicio` marca quando a sessão realmente começou (o login) e
// é carregada adiante em toda reemissão — usada só pra aplicar o teto máximo
// `maxSessaoMs` (7 dias): mesmo com uso diário contínuo, força um novo login
// depois desse prazo, limitando o estrago de um token vazado/roubado.
@Service
public class JwtService {

    private static final String CLAIM_SESSAO_INICIO = "sessaoInicio";

    private final SecretKey chave;
    private final long expiracaoMs;
    private final long maxSessaoMs;
    private final Clock clock;

    public JwtService(@Value("${jwt.secret}") String secret,
                       @Value("${jwt.expiration-ms}") long expiracaoMs,
                       @Value("${jwt.max-sessao-ms}") long maxSessaoMs,
                       Clock clock) {
        this.chave = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
        this.expiracaoMs = expiracaoMs;
        this.maxSessaoMs = maxSessaoMs;
        this.clock = clock;
    }

    // Login: começa uma sessão nova (sessaoInicio = agora).
    public String gerarToken(Long usuarioId) {
        long agora = clock.millis();
        return construirToken(usuarioId, agora, agora);
    }

    // Chamado pelo filtro a cada requisição autenticada. Mantém o
    // `sessaoInicio` original (não reinicia o teto máximo), só empurra a
    // expiração pra +expiracaoMs a partir de agora. Vazio quando a sessão já
    // passou do teto máximo — nesse caso não renova, e o token atual expira
    // normalmente no seu próprio prazo (força relogin).
    public Optional<String> renovarToken(Long usuarioId, long sessaoInicio) {
        long agora = clock.millis();
        if (agora - sessaoInicio >= maxSessaoMs) {
            return Optional.empty();
        }
        return Optional.of(construirToken(usuarioId, sessaoInicio, agora));
    }

    private String construirToken(Long usuarioId, long sessaoInicio, long agora) {
        return Jwts.builder()
                .subject(usuarioId.toString())
                .claim(CLAIM_SESSAO_INICIO, sessaoInicio)
                .issuedAt(new Date(agora))
                .expiration(new Date(agora + expiracaoMs))
                .signWith(chave)
                .compact();
    }

    public Long extrairUsuarioId(String token) {
        return Long.valueOf(parseClaims(token).getSubject());
    }

    // Fallback pro issuedAt: tokens emitidos antes desta claim existir (já em
    // uso no momento do deploy) não têm sessaoInicio — trata a data de emissão
    // deles como o início da sessão, em vez de quebrar a renovação.
    public long extrairSessaoInicio(String token) {
        Claims claims = parseClaims(token);
        Object valor = claims.get(CLAIM_SESSAO_INICIO);
        return valor instanceof Number numero ? numero.longValue() : claims.getIssuedAt().getTime();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(chave)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

}
