package com.financas.app.repository;

import com.financas.app.model.Despesa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DespesaRepository extends JpaRepository<Despesa, Long>, JpaSpecificationExecutor<Despesa> {

    List<Despesa> findByUsuarioId(Long usuarioId);

    boolean existsByCategoriaId(Long categoriaId);

    void deleteByCategoriaId(Long categoriaId);

    Optional<Despesa> findTopByRecorrenciaIdOrderByDataDesc(Long recorrenciaId);

    // Usado pelo catch-up para não regravar um mês que já existe na série. A
    // janela é o mês inteiro porque a chave da ocorrência é o mês de `data`,
    // não o dia (que o usuário pode ter editado).
    boolean existsByRecorrenciaIdAndDataBetween(Long recorrenciaId, LocalDate inicio, LocalDate fim);

    // Todas as parcelas da mesma compra, em ordem (1/3, 2/3, 3/3). Usado pela
    // edicao e pela exclusao, que agem na compra inteira e nao na linha
    // isolada - ver DespesaService.
    List<Despesa> findByParcelamentoIdOrderByParcelaNumeroAsc(Long parcelamentoId);

    @Query("""
            SELECT d.categoria.id AS categoriaId, COUNT(d) AS total
            FROM Despesa d
            WHERE d.usuario.id = :usuarioId
            GROUP BY d.categoria.id
            """)
    List<ContagemCategoria> contarPorCategoria(@Param("usuarioId") Long usuarioId);

}
