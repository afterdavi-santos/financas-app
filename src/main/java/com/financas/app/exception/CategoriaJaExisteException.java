package com.financas.app.exception;

public class CategoriaJaExisteException extends RuntimeException {

    public CategoriaJaExisteException() {
        super("Já existe uma categoria com esse nome e tipo.");
    }

}
