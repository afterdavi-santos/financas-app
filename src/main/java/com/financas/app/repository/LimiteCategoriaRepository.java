package com.financas.app.repository;

import com.financas.app.model.LimiteCategoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LimiteCategoriaRepository extends JpaRepository<LimiteCategoria, Long> {

    List<LimiteCategoria> findByUsuarioId(Long usuarioId);

    // Vigências que cobrem o mês pedido: mesInicio <= mes < mesFim (mesFim
    // nulo = ainda vigente). É o intervalo semiaberto descrito na V3.
    @Query("""
            SELECT l FROM LimiteCategoria l
            WHERE l.usuario.id = :usuarioId
              AND l.mesInicio <= :mes
              AND (l.mesFim IS NULL OR l.mesFim > :mes)
            """)
    List<LimiteCategoria> findVigentesNoMes(@Param("usuarioId") Long usuarioId,
                                            @Param("mes") LocalDate mes);

    @Query("""
            SELECT l FROM LimiteCategoria l
            WHERE l.usuario.id = :usuarioId
              AND l.categoria.id = :categoriaId
              AND l.mesInicio <= :mes
              AND (l.mesFim IS NULL OR l.mesFim > :mes)
            """)
    Optional<LimiteCategoria> findVigenteNoMes(@Param("usuarioId") Long usuarioId,
                                               @Param("categoriaId") Long categoriaId,
                                               @Param("mes") LocalDate mes);

    // Já existe vigência desta categoria que alcance o mês pedido ou
    // qualquer mês depois dele? É o que impede duas vigências concorrentes
    // na mesma categoria — sem impedir criar um limite novo depois de um
    // antigo ter sido encerrado.
    @Query("""
            SELECT COUNT(l) > 0 FROM LimiteCategoria l
            WHERE l.usuario.id = :usuarioId
              AND l.categoria.id = :categoriaId
              AND (l.mesFim IS NULL OR l.mesFim > :mes)
            """)
    boolean existeVigenciaAlcancando(@Param("usuarioId") Long usuarioId,
                                     @Param("categoriaId") Long categoriaId,
                                     @Param("mes") LocalDate mes);

    boolean existsByCategoriaId(Long categoriaId);

    void deleteByCategoriaId(Long categoriaId);

}
