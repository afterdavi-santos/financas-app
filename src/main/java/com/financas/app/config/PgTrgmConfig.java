package com.financas.app.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

// Habilita a extensão pg_trgm (busca por similaridade de texto, usada pela
// busca de categorias parecidas) no startup. Idempotente (IF NOT EXISTS);
// roda como ApplicationRunner (não @PostConstruct) pra garantir que o
// DataSource/pool já está totalmente pronto. Este projeto não tem Flyway —
// mudanças de schema fora do que o Hibernate cobre (ddl-auto=update) passam
// por aqui.
@Configuration
public class PgTrgmConfig {

    @Bean
    public ApplicationRunner criarExtensaoPgTrgm(JdbcTemplate jdbcTemplate) {
        return (ApplicationArguments args) -> jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    }

}
