package com.financas.app.repository;

import com.financas.app.model.Renda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RendaRepository extends JpaRepository<Renda, Long> {

    // Intervalo fechado nos dois extremos. mesReferencia é sempre o 1º dia do
    // mês, então [2026-01-01, 2026-06-01] pega janeiro a junho inclusive.
    //
    // Extremo omitido pelo cliente vira sentinela (RendaService.ABERTO_*) em
    // vez de virar um método derivado próprio: com dois extremos opcionais
    // seriam quatro combinações e quatro pares find/count. As sentinelas cabem
    // no `date` do Postgres com folga (4713 a.C. a 5874897 d.C.), então o
    // banco trata o caso "sem filtro" como qualquer outro BETWEEN.
    List<Renda> findByUsuarioIdAndMesReferenciaBetween(Long usuarioId, LocalDate inicio, LocalDate fim);

    long countByUsuarioIdAndMesReferenciaBetween(Long usuarioId, LocalDate inicio, LocalDate fim);

    List<Renda> findByUsuarioIdAndMesReferencia(Long usuarioId, LocalDate mesReferencia);

    Optional<Renda> findTopByRecorrenciaIdOrderByMesReferenciaDesc(Long recorrenciaId);

    // Usado pelo catch-up para não regravar um mês que já existe na série.
    boolean existsByRecorrenciaIdAndMesReferencia(Long recorrenciaId, LocalDate mesReferencia);

}
