package com.financas.app.dto;

import com.financas.app.model.enums.TipoCategoria;

import java.time.LocalDateTime;

// totalDespesas só é calculado de verdade em GET /categorias (listagem
// principal, usada pra ranquear as mais usadas no seletor do frontend); nos
// outros pontos que constroem este DTO (aninhado em DespesaResponse e
// LimiteCategoriaResponse) vem sempre 0 — nenhum dos dois usa esse campo, e
// calcular ali exigiria uma query extra por despesa/limite sem necessidade.
// dataCriacao pode ser null (categorias criadas antes desse campo existir).
public record CategoriaResponse(Long id, String nome, TipoCategoria tipo, long totalDespesas,
                                 LocalDateTime dataCriacao) {
}
