package com.financas.app.repository;

// Projection de "quantas despesas usam cada categoria" (usado pra ranquear as
// categorias mais usadas no seletor do frontend).
public interface ContagemCategoria {

    Long getCategoriaId();

    Long getTotal();

}
