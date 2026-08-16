package com.financas.app.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Clock;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final Clock clock;
    private final ObjectMapper objectMapper;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, Clock clock, ObjectMapper objectMapper) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        // Libera o forward interno do Spring Boot para exceções não tratadas
                        // (sem isso, o forward pro /error é barrado pelo authenticationEntryPoint
                        // abaixo e mascara o status real como 401).
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                // O rate limit fica DENTRO da cadeia do Spring Security, e não
                // como @Component: todo bean do tipo Filter é registrado
                // automaticamente pelo Boot no container, antes desta cadeia — e
                // portanto antes do CORS. Um 429 emitido lá sairia sem
                // Access-Control-Allow-Origin, o navegador bloquearia a resposta
                // e o front mostraria erro de rede em vez da mensagem de
                // bloqueio. Construído aqui, ele herda o CORS configurado acima.
                .addFilterBefore(new RateLimitLoginFilter(clock, objectMapper),
                        UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    // Libera o frontend (SPA React) a chamar a API de outra origem/porta.
    // Sem isso, o navegador bloqueia as requisicoes por Same-Origin Policy.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        // Sem isso, o navegador bloqueia o JS de ler este header custom numa
        // resposta cross-origin — a renovação de sessão (ver
        // JwtAuthenticationFilter) ficaria silenciosamente sem efeito no front.
        config.setExposedHeaders(List.of(JwtAuthenticationFilter.HEADER_TOKEN_RENOVADO));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

}
