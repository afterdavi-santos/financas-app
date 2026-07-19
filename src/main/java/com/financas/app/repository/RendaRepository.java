package com.financas.app.repository;

import com.financas.app.model.Renda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RendaRepository extends JpaRepository<Renda, Long> {

    List<Renda> findByUsuarioId(Long usuarioId);

    Optional<Renda> findByUsuarioIdAndMesReferencia(Long usuarioId, LocalDate mesReferencia);

}
