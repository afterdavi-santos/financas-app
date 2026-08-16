package com.financas.app.security;

import java.security.SecureRandom;
import java.util.Base64;

// Chave HMAC aleatória para os testes de JWT. Existe para que nenhum segredo
// real precise ser escrito em arquivo de teste: teste versionado é segredo
// versionado, e foi assim que a chave de produção acabou no histórico do git.
//
// Os testes só precisam de uma chave HS512 *válida* — nunca de uma chave
// específica —, então gerar na hora serve igual e não deixa rastro. Fica aqui,
// e não duplicada em JwtServiceTest e JwtAuthenticationFilterTest, pelo mesmo
// motivo de JanelaCatchUp: uma regra só, num lugar só.
final class ChaveHmacDeTeste {

    // 64 bytes = 512 bits, o que HS512 exige (o jjwt recusa chave menor).
    private static final int TAMANHO_BYTES = 64;

    private ChaveHmacDeTeste() {
    }

    static String gerar() {
        byte[] bytes = new byte[TAMANHO_BYTES];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

}
