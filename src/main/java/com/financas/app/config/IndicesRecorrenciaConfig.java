package com.financas.app.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

// Unicidade "uma ocorrência por mês em cada série recorrente" — a rede final
// contra o catch-up de DespesaService/RendaService duplicar uma série quando
// duas requisições da mesma tela rodam ao mesmo tempo (o lock pessimista e a
// checagem de existência nos serviços é que resolvem o caso normal).
//
// Fica aqui, e não em @Table(uniqueConstraints=...) nas entidades, por dois
// motivos: em `despesa` a chave é o MÊS de `data` (uma expressão, que
// @UniqueConstraint não expressa — só aceita colunas), e em `renda` o
// ddl-auto=update se mostrou capaz de DROPAR a constraint no startup sem
// recriá-la. Mesmo padrão idempotente de PgTrgmConfig (este projeto não tem
// Flyway).
@Configuration
public class IndicesRecorrenciaConfig {

    private static final String INDICE_DESPESA = """
            CREATE UNIQUE INDEX IF NOT EXISTS uk_despesa_recorrencia_mes
            ON despesa (recorrencia_id, (date_trunc('month', data::timestamp)))
            """;

    // `mes_referencia` em renda é sempre dia 1, então as colunas bastam.
    private static final String INDICE_RENDA = """
            CREATE UNIQUE INDEX IF NOT EXISTS uk_renda_recorrencia_mes
            ON renda (recorrencia_id, mes_referencia)
            """;

    @Bean
    public ApplicationRunner criarIndicesDeRecorrencia(JdbcTemplate jdbcTemplate) {
        return (ApplicationArguments args) -> {
            jdbcTemplate.execute(INDICE_DESPESA);
            jdbcTemplate.execute(INDICE_RENDA);
        };
    }

}
