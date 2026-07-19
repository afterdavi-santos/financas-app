package com.financas.app.repository;

import com.financas.app.model.Objetivo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ObjetivoRepository extends JpaRepository<Objetivo, Long> {

    List<Objetivo> findByUsuarioId(Long usuarioId);

}
