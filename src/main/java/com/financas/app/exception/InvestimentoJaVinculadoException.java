package com.financas.app.exception;

public class InvestimentoJaVinculadoException extends RuntimeException {

    public InvestimentoJaVinculadoException() {
        super("Este investimento já está vinculado a outro objetivo. Desvincule-o primeiro.");
    }

}
