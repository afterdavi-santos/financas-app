package com.financas.app.exception;

public class CategoriaEmUsoException extends RuntimeException {

    public CategoriaEmUsoException() {
        super("Não é possível excluir: esta categoria está sendo usada em despesas ou limites de gastos.");
    }

}
