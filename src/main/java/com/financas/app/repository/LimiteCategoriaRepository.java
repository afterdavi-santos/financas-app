package com.financas.app.repository;

import com.financas.app.model.LimiteCategoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LimiteCategoriaRepository extends JpaRepository<LimiteCategoria, Long> {

    List<LimiteCategoria> findByUsuarioIdAndMesReferencia(Long usuarioId, LocalDate mesReferencia);

    Optional<LimiteCategoria> findByUsuarioIdAndCategoriaIdAndMesReferencia(Long usuarioId, Long categoriaId, LocalDate mesReferencia);

}
