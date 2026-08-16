package com.financas.app.persistencia;

import com.financas.app.model.CdiDiario;
import com.financas.app.repository.CdiDiarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Testes que só existem porque agora há um Postgres de verdade na suíte.
 *
 * <p>Todos cobrem regras que vivem no <b>schema</b>, não no Java. Antes deste
 * bloco a suíte inteira rodava com repositório mockado, e nenhum destes casos
 * era testável — foi essa lacuna que deixou o arredondamento da taxa de CDI
 * passar despercebido por semanas.
 */
class EsquemaRealTest extends TesteComPostgresReal {

    @Autowired
    private CdiDiarioRepository cdiRepository;

    /**
     * O teste de regressão do bug real: a coluna era {@code numeric(38,2)} para
     * uma taxa de 6 casas, então 0,052531 virava 0,05 na gravação. Como o
     * CdiService compõe a taxa dia após dia, isso tirava ~0,73 ponto percentual
     * ao ano do rendimento de todo CDB, sempre para baixo.
     *
     * <p>Note que o valor é lido <b>de volta do banco</b>. Comparar o objeto em
     * memória passaria mesmo com a coluna errada — quem arredonda é o Postgres,
     * na hora de gravar.
     */
    @Test
    void taxaDeCdiDevePreservarAsSeisCasasDecimais() {
        BigDecimal taxaReal = new BigDecimal("0.052531");
        cdiRepository.save(new CdiDiario(LocalDate.of(2026, 8, 3), taxaReal));
        cdiRepository.flush();

        BigDecimal doBanco = jdbcTemplate.queryForObject(
                "select taxa_percentual from cdi_diario where data = ?",
                BigDecimal.class, LocalDate.of(2026, 8, 3));

        assertThat(doBanco).isEqualByComparingTo(taxaReal);
        // isEqualByComparingTo ignora escala, então checamos o arredondamento
        // explicitamente: com numeric(38,2) isto viria 0.05.
        assertThat(doBanco.setScale(6)).isEqualTo(new BigDecimal("0.052531"));
    }

    /**
     * O índice funcional {@code uk_despesa_recorrencia_mes} usa
     * {@code date_trunc('month', data)}: duas despesas da mesma série no mesmo
     * mês colidem mesmo em dias diferentes. É a rede final contra o catch-up
     * duplicar uma série quando duas requisições da mesma tela rodam juntas.
     *
     * <p>Índice com expressão é justamente o que o H2 não reproduz — este teste
     * é a razão de a suíte usar Postgres real.
     */
    @Test
    void deveRecusarDuasDespesasDaMesmaSerieNoMesmoMes() {
        long usuario = criarUsuario("despesa-mes@teste.local");
        long categoria = criarCategoria(usuario);
        long recorrencia = jdbcTemplate.queryForObject(
                "insert into recorrencia_despesa (ativa, data_inicio, dia_do_mes, categoria_id, usuario_id) "
                        + "values (true, ?, 5, ?, ?) returning id",
                Long.class, LocalDate.of(2026, 1, 1), categoria, usuario);

        inserirDespesa(usuario, categoria, recorrencia, LocalDate.of(2026, 3, 5));

        // Dia diferente, mesmo mês: o date_trunc do índice iguala os dois.
        assertThatThrownBy(() -> inserirDespesa(usuario, categoria, recorrencia, LocalDate.of(2026, 3, 22)))
                .isInstanceOf(DuplicateKeyException.class);
    }

    /** Mesma proteção em renda, onde a chave são colunas simples. */
    @Test
    void deveRecusarDuasRendasDaMesmaSerieNoMesmoMes() {
        long usuario = criarUsuario("renda-mes@teste.local");
        long recorrencia = jdbcTemplate.queryForObject(
                "insert into recorrencia_renda (ativa, data_inicio, usuario_id) values (true, ?, ?) returning id",
                Long.class, LocalDate.of(2026, 1, 1), usuario);

        inserirRenda(usuario, recorrencia, LocalDate.of(2026, 3, 1));

        assertThatThrownBy(() -> inserirRenda(usuario, recorrencia, LocalDate.of(2026, 3, 1)))
                .isInstanceOf(DuplicateKeyException.class);
    }

    /**
     * Rendas avulsas (sem série) podem repetir mês à vontade: no Postgres, NULL
     * não colide com NULL num índice único. Se alguém "consertar" o índice
     * trocando por NOT NULL ou por uma constraint que trate NULL como valor,
     * este teste quebra — que é o ponto.
     */
    @Test
    void deveAceitarVariasRendasAvulsasNoMesmoMes() {
        long usuario = criarUsuario("renda-avulsa@teste.local");

        inserirRenda(usuario, null, LocalDate.of(2026, 3, 1));
        inserirRenda(usuario, null, LocalDate.of(2026, 3, 1));

        Integer total = jdbcTemplate.queryForObject(
                "select count(*) from renda where usuario_id = ?", Integer.class, usuario);
        assertThat(total).isEqualTo(2);
    }

    /**
     * A extensão pg_trgm sai da migração, não mais de um ApplicationRunner. Sem
     * ela, a busca por categorias parecidas (CategoriaRepository.buscarSemelhantes)
     * falha com "function similarity does not exist" — em runtime, na cara do
     * usuário, porque é native query e o Hibernate não a valida no start.
     */
    @Test
    void extensaoPgTrgmDeveEstarHabilitadaPelaMigracao() {
        Double similaridade = jdbcTemplate.queryForObject(
                "select similarity('mercado', 'mercadoo')", Double.class);

        assertThat(similaridade).isGreaterThan(0.35);
    }

    // --- auxiliares ---

    private long criarUsuario(String email) {
        return jdbcTemplate.queryForObject(
                "insert into usuario (nome, email, senha, data_criacao) values ('Teste', ?, 'x', now()) returning id",
                Long.class, email);
    }

    private long criarCategoria(long usuarioId) {
        return jdbcTemplate.queryForObject(
                "insert into categoria (nome, tipo, usuario_id, data_criacao) "
                        + "values ('Teste', 'FIXA', ?, now()) returning id",
                Long.class, usuarioId);
    }

    private void inserirDespesa(long usuario, long categoria, Long recorrencia, LocalDate data) {
        jdbcTemplate.update(
                "insert into despesa (data, descricao, valor, categoria_id, usuario_id, recorrencia_id) "
                        + "values (?, 'Teste', 10.00, ?, ?, ?)",
                data, categoria, usuario, recorrencia);
    }

    private void inserirRenda(long usuario, Long recorrencia, LocalDate mesReferencia) {
        jdbcTemplate.update(
                "insert into renda (descricao, mes_referencia, tipo, valor, usuario_id, recorrencia_id) "
                        + "values ('Teste', ?, 'FIXA', 10.00, ?, ?)",
                mesReferencia, usuario, recorrencia);
    }
}
