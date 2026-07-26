package com.financas.app.repository;

import com.financas.app.model.Despesa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface DespesaRepository extends JpaRepository<Despesa, Long>, JpaSpecificationExecutor<Despesa> {

    List<Despesa> findByUsuarioId(Long usuarioId);

    boolean existsByCategoriaId(Long categoriaId);

    void deleteByCategoriaId(Long categoriaId);

}
