package com.financas.app.repository;

import com.financas.app.model.RecorrenciaRenda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecorrenciaRendaRepository extends JpaRepository<RecorrenciaRenda, Long> {

    List<RecorrenciaRenda> findByUsuarioIdAndAtivaTrue(Long usuarioId);

}
