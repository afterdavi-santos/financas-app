package com.financas.app.exception;

// Ação pedida não faz sentido para o estado atual do recurso
// (ex.: resgatar uma renda que não é CDB, ou que já foi resgatada).
public class OperacaoInvalidaException extends RuntimeException {

    public OperacaoInvalidaException(String mensagem) {
        super(mensagem);
    }

}
