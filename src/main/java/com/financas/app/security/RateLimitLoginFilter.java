package com.financas.app.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.financas.app.exception.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

// Sem este filtro, dá para tentar senha infinitas vezes sem nenhum atrito — a
// auditoria confirmou 12 tentativas seguidas sem atraso nenhum. Com isso,
// adivinhar uma senha vira só uma questão de tempo de CPU.
//
// São DUAS contagens, e as duas são necessárias porque protegem de ataques
// diferentes:
//
//   - por e-mail: impede moer uma conta específica com milhares de senhas.
//     Sozinha, não segura o ataque de "senha comum contra muitas contas" —
//     nele cada e-mail leva pouquíssimas tentativas e nenhum estoura o teto.
//   - por IP: pega exatamente esse caso, o de uma origem varrendo vários
//     e-mails. Teto mais alto, porque uma casa/rede compartilhada pode ter
//     mais de uma pessoa usando o app legitimamente.
//
// O IP vem de getRemoteAddr(), e NÃO do X-Forwarded-For, de propósito: esse
// header é escrito pelo cliente. Confiar nele seria entregar a chave da
// contagem ao atacante, que passaria a mandar um IP falso diferente a cada
// tentativa e zeraria o limite. Se um dia entrar um proxy reverso na frente,
// aí sim o header passa a valer — mas só depois de configurar quais proxies
// são confiáveis.
@Slf4j
public class RateLimitLoginFilter extends OncePerRequestFilter {

    static final String CAMINHO_LOGIN = "/api/auth/login";

    private static final long JANELA_MS = Duration.ofMinutes(15).toMillis();
    private static final int MAX_FALHAS_POR_EMAIL = 5;
    private static final int MAX_FALHAS_POR_IP = 20;

    // Teto de chaves vivas antes de varrer as expiradas. Na prática é difícil
    // chegar perto: o limite por IP corta uma origem em 20 tentativas, e é a
    // tentativa que cria a chave. Só um ataque distribuído por muitos IPs
    // encheria o mapa — e aí a varredura devolve a memória.
    private static final int MAX_CHAVES = 10_000;

    private final Clock clock;
    private final ObjectMapper objectMapper;
    private final Map<String, Deque<Long>> falhasPorChave = new ConcurrentHashMap<>();

    public RateLimitLoginFilter(Clock clock, ObjectMapper objectMapper) {
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    // getRequestURI() em vez de getServletPath(): o primeiro é consistente
    // entre o Tomcat de verdade e o MockMvc dos testes. O contextPath é
    // descontado para o caminho ficar relativo à aplicação.
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String caminho = request.getRequestURI().substring(request.getContextPath().length());
        return !("POST".equalsIgnoreCase(request.getMethod()) && CAMINHO_LOGIN.equals(caminho));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        CorpoCacheadoRequest requisicao = new CorpoCacheadoRequest(request);

        String chaveIp = "ip:" + request.getRemoteAddr();
        String chaveEmail = extrairEmail(requisicao).map(email -> "email:" + email).orElse(null);

        // O IP é checado primeiro de propósito: quando ele já estourou, nem
        // chegamos a registrar a chave do e-mail. É isso que impede alguém de
        // encher o mapa mandando um e-mail diferente a cada requisição.
        long esperaMs = millisAteLiberar(chaveIp, MAX_FALHAS_POR_IP);
        if (esperaMs <= 0 && chaveEmail != null) {
            esperaMs = millisAteLiberar(chaveEmail, MAX_FALHAS_POR_EMAIL);
        }
        if (esperaMs > 0) {
            responder429(request, response, esperaMs);
            return;
        }

        filterChain.doFilter(requisicao, response);

        // 401 é a resposta de credencial errada (CredenciaisInvalidasException).
        // Um 400 de validação não conta: é requisição malformada, não tentativa
        // de adivinhar senha.
        //
        // Vale reparar que a contagem não olha se o e-mail existe. Se contasse
        // só para conta existente, a diferença de comportamento entre um e-mail
        // cadastrado e um inexistente viraria justamente o que o 401 genérico
        // tenta esconder.
        if (response.getStatus() == HttpStatus.UNAUTHORIZED.value()) {
            registrarFalha(chaveIp);
            if (chaveEmail != null) {
                registrarFalha(chaveEmail);
            }
        } else if (response.getStatus() == HttpStatus.OK.value() && chaveEmail != null) {
            // Login certo zera o contador daquela conta — quem errou a senha
            // umas vezes e acertou não fica de castigo. O contador do IP fica:
            // ter uma conta válida não deveria dar direito a continuar tentando
            // adivinhar as outras.
            falhasPorChave.remove(chaveEmail);
        }
    }

    private Optional<String> extrairEmail(CorpoCacheadoRequest requisicao) {
        try {
            JsonNode raiz = objectMapper.readTree(requisicao.corpo());
            JsonNode email = raiz == null ? null : raiz.get("email");
            if (email == null || !email.isTextual() || email.asText().isBlank()) {
                return Optional.empty();
            }
            // Normaliza para minúsculas: sem isso, alternar a caixa do e-mail
            // ("Davi@" / "davi@") geraria uma chave nova a cada tentativa e o
            // limite por conta não valeria nada.
            return Optional.of(email.asText().trim().toLowerCase(Locale.ROOT));
        } catch (IOException e) {
            // Corpo que não é JSON válido: sem e-mail para contar. O limite por
            // IP continua valendo, e o corpo malformado vira 400 mais adiante.
            return Optional.empty();
        }
    }

    // Zero quando ainda há folga. Positivo = quanto falta para a falha mais
    // antiga sair da janela e liberar uma vaga.
    private long millisAteLiberar(String chave, int maximo) {
        AtomicLong espera = new AtomicLong();
        // Toda leitura e escrita acontece dentro do compute do ConcurrentHashMap,
        // que segura o lock daquela chave. É o que garante que podar, contar e
        // registrar não se atropelem entre requisições simultâneas.
        falhasPorChave.computeIfPresent(chave, (c, registros) -> {
            podar(registros);
            if (registros.size() >= maximo) {
                espera.set(registros.peekFirst() + JANELA_MS - clock.millis());
            }
            return registros.isEmpty() ? null : registros;
        });
        return espera.get();
    }

    private void registrarFalha(String chave) {
        falhasPorChave.compute(chave, (c, registros) -> {
            Deque<Long> atual = registros == null ? new ArrayDeque<>() : registros;
            podar(atual);
            atual.addLast(clock.millis());
            return atual;
        });
        if (falhasPorChave.size() > MAX_CHAVES) {
            varrerExpiradas();
        }
    }

    // Janela deslizante: descarta as falhas que já saíram dos últimos 15
    // minutos. É o que diferencia de um contador fixo — o bloqueio vai
    // afrouxando aos poucos, em vez de zerar de uma vez na virada da janela.
    private void podar(Deque<Long> registros) {
        long limite = clock.millis() - JANELA_MS;
        while (!registros.isEmpty() && registros.peekFirst() <= limite) {
            registros.pollFirst();
        }
    }

    private void varrerExpiradas() {
        for (String chave : falhasPorChave.keySet()) {
            falhasPorChave.computeIfPresent(chave, (c, registros) -> {
                podar(registros);
                return registros.isEmpty() ? null : registros;
            });
        }
    }

    private void responder429(HttpServletRequest request, HttpServletResponse response, long esperaMs)
            throws IOException {
        long esperaSegundos = Math.max(1, (esperaMs + 999) / 1000);
        log.warn("Login bloqueado por excesso de tentativas: ip={}, liberado em {}s",
                request.getRemoteAddr(), esperaSegundos);

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        // Retry-After diz ao cliente quando vale a pena tentar de novo, em vez
        // de deixar a pessoa (ou o front) chutando.
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(esperaSegundos));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());

        // Mesmo formato de erro do GlobalExceptionHandler. Um filtro roda antes
        // do @ExceptionHandler existir no caminho, então o corpo é montado na
        // mão — mas o front não deveria ter que reconhecer dois formatos.
        ErrorResponse corpo = new ErrorResponse(HttpStatus.TOO_MANY_REQUESTS.value(),
                "Muitas tentativas de login. Tente novamente em " + descreverEspera(esperaSegundos) + ".");
        response.getWriter().write(objectMapper.writeValueAsString(corpo));
    }

    // O Retry-After vai em segundos porque o padrão HTTP manda, mas "899
    // segundos" não é um jeito humano de dizer 15 minutos — e essa frase
    // aparece na tela de login.
    private static String descreverEspera(long segundos) {
        if (segundos < 60) {
            return segundos + (segundos == 1 ? " segundo" : " segundos");
        }
        long minutos = (segundos + 59) / 60;
        return minutos + (minutos == 1 ? " minuto" : " minutos");
    }

}
