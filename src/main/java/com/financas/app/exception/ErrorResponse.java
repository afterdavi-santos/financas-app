package com.financas.app.exception;

import java.time.LocalDateTime;
import java.util.List;

public record ErrorResponse(int status, String mensagem, LocalDateTime timestamp, List<String> erros) {

    public ErrorResponse(int status, String mensagem) {
        this(status, mensagem, LocalDateTime.now(), List.of());
    }

    public ErrorResponse(int status, String mensagem, List<String> erros) {
        this(status, mensagem, LocalDateTime.now(), erros);
    }

}
