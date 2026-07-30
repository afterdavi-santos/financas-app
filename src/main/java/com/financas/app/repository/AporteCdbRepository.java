package com.financas.app.repository;

import com.financas.app.model.AporteCdb;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AporteCdbRepository extends JpaRepository<AporteCdb, Long> {

    // Ordem FIFO (aporte mais antigo primeiro) — é a ordem usada pra consumir
    // lotes num resgate parcial.
    List<AporteCdb> findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(Long investimentoId);

}
