package com.financas.app.security;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

// O corpo de uma requisição só pode ser lido uma vez: é um stream, e depois de
// consumido não volta. O RateLimitLoginFilter precisa do e-mail, que está no
// corpo — sem este wrapper, o controller receberia um corpo vazio depois do
// filtro passar.
//
// A solução é ler tudo para um byte[] no construtor e entregar um stream novo
// sobre esse array a cada chamada. Guardar o corpo inteiro em memória é
// aceitável aqui porque este wrapper só é usado no /api/auth/login, cujo DTO
// tem tetos de tamanho — não é um wrapper de uso geral.
class CorpoCacheadoRequest extends HttpServletRequestWrapper {

    private final byte[] corpo;

    CorpoCacheadoRequest(HttpServletRequest request) throws IOException {
        super(request);
        this.corpo = request.getInputStream().readAllBytes();
    }

    byte[] corpo() {
        return corpo;
    }

    @Override
    public ServletInputStream getInputStream() {
        ByteArrayInputStream fonte = new ByteArrayInputStream(corpo);
        return new ServletInputStream() {
            @Override
            public int read() {
                return fonte.read();
            }

            @Override
            public boolean isFinished() {
                return fonte.available() == 0;
            }

            @Override
            public boolean isReady() {
                return true;
            }

            @Override
            public void setReadListener(ReadListener readListener) {
                throw new UnsupportedOperationException("Leitura assíncrona não é usada neste filtro.");
            }
        };
    }

    @Override
    public BufferedReader getReader() {
        return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
    }

}
