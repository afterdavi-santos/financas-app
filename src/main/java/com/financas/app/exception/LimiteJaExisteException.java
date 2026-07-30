package com.financas.app.exception;

public class LimiteJaExisteException extends RuntimeException {

    public LimiteJaExisteException() {
        super("Já existe um limite para esta categoria. Edite o limite existente.");
    }

}
