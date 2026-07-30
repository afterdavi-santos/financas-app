package com.financas.app.repository;

import com.financas.app.model.Aporte;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AporteRepository extends JpaRepository<Aporte, Long> {

    // Linha do tempo: aportes do objetivo em ordem cronológica.
    List<Aporte> findByObjetivoIdOrderByDataAscIdAsc(Long objetivoId);

}
