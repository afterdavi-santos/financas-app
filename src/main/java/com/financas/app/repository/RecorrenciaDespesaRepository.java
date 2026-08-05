package com.financas.app.repository;

import com.financas.app.model.RecorrenciaDespesa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecorrenciaDespesaRepository extends JpaRepository<RecorrenciaDespesa, Long> {

    List<RecorrenciaDespesa> findByUsuarioIdAndAtivaTrue(Long usuarioId);

    void deleteByCategoriaId(Long categoriaId);

}
