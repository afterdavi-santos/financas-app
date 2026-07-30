package com.financas.app.repository;

import com.financas.app.model.CdiDiario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CdiDiarioRepository extends JpaRepository<CdiDiario, LocalDate> {

    List<CdiDiario> findByDataBetweenOrderByDataAsc(LocalDate inicio, LocalDate fim);

    Optional<CdiDiario> findTopByOrderByDataDesc();

    Optional<CdiDiario> findTopByOrderByDataAsc();

}
