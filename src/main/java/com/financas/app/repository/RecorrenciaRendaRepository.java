package com.financas.app.repository;

import com.financas.app.model.RecorrenciaRenda;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecorrenciaRendaRepository extends JpaRepository<RecorrenciaRenda, Long> {

    List<RecorrenciaRenda> findByUsuarioIdAndAtivaTrue(Long usuarioId);

    // Mesma busca, mas travando as linhas até o fim da transação. O catch-up de
    // rendas fixas roda em toda listagem, e a tela dispara GET /rendas e
    // GET /rendas/total em paralelo: sem o lock, as duas leem "última ocorrência
    // = julho" e ambas geram agosto, duplicando a série (foi o que aconteceu com
    // a série "teste1"). Com ele, a segunda espera e encontra o mês já gravado.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RecorrenciaRenda r where r.usuario.id = :usuarioId and r.ativa = true")
    List<RecorrenciaRenda> travarAtivasDoUsuario(@Param("usuarioId") Long usuarioId);

}
