package com.financas.app.repository;

import com.financas.app.model.Categoria;
import com.financas.app.model.enums.TipoCategoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    List<Categoria> findByUsuarioId(Long usuarioId);

    // Nome comparado sem diferenciar maiúsculas/minúsculas — "Mercado" e
    // "mercado" contam como o mesmo nome pra essa checagem. Duas categorias
    // com o mesmo nome só podem coexistir se forem de tipos diferentes
    // (Fixa/Variável), daí exigir também o `tipo` na comparação.
    boolean existsByNomeIgnoreCaseAndTipoAndUsuarioId(String nome, TipoCategoria tipo, Long usuarioId);

    // Mesma checagem, excluindo a própria categoria — usada na edição, pra
    // não acusar conflito da categoria consigo mesma quando nome/tipo não
    // mudam.
    boolean existsByNomeIgnoreCaseAndTipoAndUsuarioIdAndIdNot(
            String nome, TipoCategoria tipo, Long usuarioId, Long id);

    // similarity() (pg_trgm) em vez do operador `%` pra controlar o limiar
    // explicitamente pelo Java, sem depender do GUC de sessão do Postgres.
    @Query(value = """
            SELECT * FROM categoria c
            WHERE c.usuario_id = :usuarioId
              AND similarity(c.nome, :nome) > :limiar
            ORDER BY similarity(c.nome, :nome) DESC
            """, nativeQuery = true)
    List<Categoria> buscarSemelhantes(@Param("usuarioId") Long usuarioId,
                                       @Param("nome") String nome,
                                       @Param("limiar") double limiar);

}
