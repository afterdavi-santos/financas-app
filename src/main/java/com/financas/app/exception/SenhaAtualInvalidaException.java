package com.financas.app.exception;

public class SenhaAtualInvalidaException extends RuntimeException {

    public SenhaAtualInvalidaException() {
        super("Senha atual inválida");
    }

}
