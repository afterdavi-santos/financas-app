package com.financas.app.repository;

import com.financas.app.model.InvestimentoCdb;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvestimentoCdbRepository extends JpaRepository<InvestimentoCdb, Long> {

    // Ordem de inserção (id crescente) — sem ORDER BY, o banco não garante
    // nenhuma ordem específica de retorno.
    List<InvestimentoCdb> findByUsuarioIdOrderByIdAsc(Long usuarioId);

}
