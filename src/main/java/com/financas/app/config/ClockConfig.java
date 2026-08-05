package com.financas.app.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

// Clock injetável (em vez de `new Date()`/`Instant.now()` espalhado) — deixa
// a lógica de expiração/renovação de sessão em JwtService testável com um
// relógio fixo, sem precisar esperar tempo real passar.
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

}
