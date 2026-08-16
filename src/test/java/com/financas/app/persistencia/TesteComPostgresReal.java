package com.financas.app.persistencia;

import com.financas.app.security.ChaveHmacDeTeste;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base dos testes que precisam de banco de verdade.
 *
 * <p>Por que Postgres em container e não H2: o schema usa a extensão
 * {@code pg_trgm} e um índice funcional com {@code date_trunc()}, e o modo
 * PostgreSQL do H2 não suporta nenhum dos dois. Um teste que passasse no H2 e
 * falhasse no Postgres seria pior que não ter teste — é falsa confiança, que é
 * justamente o problema que estes testes existem para eliminar.
 *
 * <p>O container é {@code static}: sobe uma vez por execução da suíte inteira,
 * não uma vez por classe. Postgres leva alguns segundos para ficar pronto, e
 * pagar isso por classe de teste tornaria a suíte lenta o bastante para as
 * pessoas pararem de rodá-la.
 *
 * <p>O schema vem do Flyway, das mesmas migrações que rodam em produção — não
 * de {@code ddl-auto=create}. É isso que torna estes testes uma prova: se a
 * migração e as entidades divergirem, o contexto nem sobe, porque o
 * {@code ddl-auto=validate} reprova antes.
 */
@SpringBootTest
@Testcontainers
public abstract class TesteComPostgresReal {

    // A mesma major do banco de desenvolvimento e do docker-compose. Testar
    // contra outra versão reintroduziria a diferença que queremos eliminar.
    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    // O app exige JWT_SECRET do ambiente e falha no start sem ela (proposital,
    // ver application.properties). Nos testes ela não pode vir do ambiente da
    // máquina: a suíte tem de rodar em qualquer lugar, e depender de variável
    // externa transformaria "esqueci de exportar" em falha de teste confusa.
    // Uma chave aleatória por execução basta — mesma lógica do ChaveHmacDeTeste.
    @TestConfiguration
    static class PropriedadesDeTeste {
        @Bean
        DynamicPropertyRegistrar segredoJwtDeTeste() {
            String chave = ChaveHmacDeTeste.gerar();
            return registry -> registry.add("jwt.secret", () -> chave);
        }
    }
}
