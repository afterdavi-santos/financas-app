package com.financas.app.repository;

import com.financas.app.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    List<Categoria> findByUsuarioId(Long usuarioId);

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
