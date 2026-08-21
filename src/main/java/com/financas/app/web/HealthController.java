package com.financas.app.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Health check para a hospedagem (ver render.yaml, healthCheckPath).
 *
 * <p>Precisa ser PÚBLICO: a plataforma chama esta rota sem nenhuma credencial e
 * lê qualquer coisa diferente de 200 como "serviço fora do ar" — apontar o
 * health check para uma rota autenticada faria o 401 virar um ciclo de
 * reinicializações sem fim.
 *
 * <p>Não devolve nada além de {@code {"status":"ok"}} de propósito. Versão,
 * nome de host, uptime ou estado do banco seriam informação de graça para quem
 * estiver sondando a API, e a plataforma não precisa de nada disso: o que ela
 * pergunta é apenas se o processo subiu e está atendendo HTTP.
 *
 * <p>Que o contexto do Spring subiu já implica que o Flyway aplicou as migrações
 * e que o {@code ddl-auto=validate} aprovou o schema — os dois acontecem antes
 * de a aplicação aceitar a primeira requisição.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

}
