package com.financas.app.repository;

import com.financas.app.model.Despesa;
import com.financas.app.model.enums.TipoCategoria;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

// "Filtro nao aplicado" e Specification.unrestricted(), nao null: no Spring
// Data JPA 4 o .and() rejeita null (IllegalArgumentException "Other
// specification must not be null"), enquanto na 3.x ele era tolerado e virava
// no-op. unrestricted() e o no-op explicito que substituiu aquele null.
public class DespesaSpecification {

    private DespesaSpecification() {
    }

    public static Specification<Despesa> comUsuario(Long usuarioId) {
        return (root, query, cb) -> cb.equal(root.get("usuario").get("id"), usuarioId);
    }

    public static Specification<Despesa> comCategoria(Long categoriaId) {
        if (categoriaId == null) {
            return Specification.unrestricted();
        }
        return (root, query, cb) -> cb.equal(root.get("categoria").get("id"), categoriaId);
    }

    // Tipo agora vive na categoria, não na despesa: filtra pelo relacionamento.
    public static Specification<Despesa> comTipo(TipoCategoria tipo) {
        if (tipo == null) {
            return Specification.unrestricted();
        }
        return (root, query, cb) -> cb.equal(root.get("categoria").get("tipo"), tipo);
    }

    // Filtra pelo "mês efetivo" (mesReferencia, se presente; senão data) —
    // usado por todo filtro de orçamento (listagem, totais, relatórios).
    public static Specification<Despesa> comPeriodo(LocalDate inicio, LocalDate fim) {
        if (inicio == null && fim == null) {
            return Specification.unrestricted();
        }
        if (inicio != null && fim != null) {
            return (root, query, cb) -> cb.between(
                    cb.coalesce(root.get("mesReferencia"), root.get("data")), inicio, fim);
        }
        if (inicio != null) {
            return (root, query, cb) -> cb.greaterThanOrEqualTo(
                    cb.coalesce(root.get("mesReferencia"), root.get("data")), inicio);
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(
                cb.coalesce(root.get("mesReferencia"), root.get("data")), fim);
    }

    // Filtra pela data REAL da compra, ignorando mesReferencia — usado só
    // pela busca de candidatas a duplicata do Leitor de fatura, onde
    // proximidade de data real (não mês de orçamento) é o que importa.
    public static Specification<Despesa> comPeriodoReal(LocalDate inicio, LocalDate fim) {
        if (inicio == null && fim == null) {
            return Specification.unrestricted();
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
