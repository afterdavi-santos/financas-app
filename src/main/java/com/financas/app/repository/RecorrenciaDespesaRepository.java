package com.financas.app.repository;

import com.financas.app.model.RecorrenciaDespesa;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecorrenciaDespesaRepository extends JpaRepository<RecorrenciaDespesa, Long> {

    List<RecorrenciaDespesa> findByUsuarioIdAndAtivaTrue(Long usuarioId);

    // Mesma busca, mas travando as linhas até o fim da transação — ver o
    // gêmeo em RecorrenciaRendaRepository. A tela de Despesas é ainda mais
    // exposta: dispara lista, total do mês, total por categoria e comparação
    // de meses em paralelo, e todos rodam o catch-up.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RecorrenciaDespesa r where r.usuario.id = :usuarioId and r.ativa = true")
    List<RecorrenciaDespesa> travarAtivasDoUsuario(@Param("usuarioId") Long usuarioId);

    void deleteByCategoriaId(Long categoriaId);

}
