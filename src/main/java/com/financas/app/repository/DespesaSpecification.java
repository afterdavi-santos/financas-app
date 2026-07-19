package com.financas.app.repository;

import com.financas.app.model.Despesa;
import com.financas.app.model.enums.TipoDespesa;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class DespesaSpecification {

    private DespesaSpecification() {
    }

    public static Specification<Despesa> comUsuario(Long usuarioId) {
        return (root, query, cb) -> cb.equal(root.get("usuario").get("id"), usuarioId);
    }

    public static Specification<Despesa> comCategoria(Long categoriaId) {
        if (categoriaId == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("categoria").get("id"), categoriaId);
    }

    public static Specification<Despesa> comTipo(TipoDespesa tipo) {
        if (tipo == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("tipo"), tipo);
    }

    public static Specification<Despesa> comPeriodo(LocalDate inicio, LocalDate fim) {
        if (inicio == null && fim == null) {
            return null;
        }
        if (inicio != null && fim != null) {
            return (root, query, cb) -> cb.between(root.get("data"), inicio, fim);
        }
        if (inicio != null) {
            return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("data"), inicio);
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("data"), fim);
    }

}
