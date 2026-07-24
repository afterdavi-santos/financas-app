package com.financas.app.repository;

import com.financas.app.model.LimiteCategoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LimiteCategoriaRepository extends JpaRepository<LimiteCategoria, Long> {

    List<LimiteCategoria> findByUsuarioId(Long usuarioId);

    Optional<LimiteCategoria> findByUsuarioIdAndCategoriaId(Long usuarioId, Long categoriaId);

}
