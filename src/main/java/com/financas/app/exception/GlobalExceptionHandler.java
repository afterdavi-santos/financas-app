package com.financas.app.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ErrorResponse> tratarRecursoNaoEncontrado(RecursoNaoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(HttpStatus.NOT_FOUND.value(), ex.getMessage()));
    }

    @ExceptionHandler(EmailJaCadastradoException.class)
    public ResponseEntity<ErrorResponse> tratarEmailJaCadastrado(EmailJaCadastradoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(HttpStatus.CONFLICT.value(), ex.getMessage()));
    }

    @ExceptionHandler(LimiteJaExisteException.class)
    public ResponseEntity<ErrorResponse> tratarLimiteJaExiste(LimiteJaExisteException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(HttpStatus.CONFLICT.value(), ex.getMessage()));
    }

    @ExceptionHandler(CategoriaEmUsoException.class)
    public ResponseEntity<ErrorResponse> tratarCategoriaEmUso(CategoriaEmUsoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(HttpStatus.CONFLICT.value(), ex.getMessage()));
    }

    @ExceptionHandler(CategoriaJaExisteException.class)
    public ResponseEntity<ErrorResponse> tratarCategoriaJaExiste(CategoriaJaExisteException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(HttpStatus.CONFLICT.value(), ex.getMessage()));
    }

    @ExceptionHandler(InvestimentoJaVinculadoException.class)
    public ResponseEntity<ErrorResponse> tratarInvestimentoJaVinculado(InvestimentoJaVinculadoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(HttpStatus.CONFLICT.value(), ex.getMessage()));
    }

    @ExceptionHandler(OperacaoInvalidaException.class)
    public ResponseEntity<ErrorResponse> tratarOperacaoInvalida(OperacaoInvalidaException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    @ExceptionHandler(CredenciaisInvalidasException.class)
    public ResponseEntity<ErrorResponse> tratarCredenciaisInvalidas(CredenciaisInvalidasException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(HttpStatus.UNAUTHORIZED.value(), ex.getMessage()));
    }

    @ExceptionHandler(SenhaAtualInvalidaException.class)
    public ResponseEntity<ErrorResponse> tratarSenhaAtualInvalida(SenhaAtualInvalidaException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(HttpStatus.UNAUTHORIZED.value(), ex.getMessage()));
    }

    @ExceptionHandler(FotoInvalidaException.class)
    public ResponseEntity<ErrorResponse> tratarFotoInvalida(FotoInvalidaException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    @ExceptionHandler(FaturaInvalidaException.class)
    public ResponseEntity<ErrorResponse> tratarFaturaInvalida(FaturaInvalidaException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    // 400 e não 413: o corpo da requisição está bem formado e é pequeno; quem
    // seria grande demais é a RESPOSTA que ele pediu. 413 fala do corpo que
    // chegou, então mentiria sobre a causa.
    @ExceptionHandler(ResultadoExcessivoException.class)
    public ResponseEntity<ErrorResponse> tratarResultadoExcessivo(ResultadoExcessivoException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> tratarValidacao(MethodArgumentNotValidException ex) {
        List<String> erros = ex.getBindingResult().getFieldErrors().stream()
                .map(erro -> erro.getField() + ": " + erro.getDefaultMessage())
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(), "Erro de validação", erros));
    }

    // Rede de segurança para o que escapar das anotações dos DTOs: uma coluna
    // com teto que ninguém anotou, uma constraint do banco que só dispara numa
    // corrida entre duas requisições. Sem este handler, esses casos viram 500 —
    // e 500 quer dizer "erro do servidor", quando o problema veio do dado que
    // chegou.
    //
    // A mensagem é fixa de propósito. `ex.getMessage()` traz o texto cru do
    // Postgres, com nome de tabela, de coluna e de constraint. Devolver isso
    // entrega o desenho do banco a quem estiver sondando a API — e não ajuda
    // em nada quem está usando o app. O detalhe fica no log do servidor, que é
    // onde ele serve para alguma coisa.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> tratarViolacaoIntegridade(DataIntegrityViolationException ex) {
        log.warn("Violação de integridade ao gravar", ex);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(),
                        "Não foi possível salvar: verifique os dados enviados."));
    }

}
