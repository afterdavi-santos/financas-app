package com.financas.app.web;

import com.financas.app.dto.ProcessarFaturaResponse;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.LeituraFaturaService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/leitura-fatura")
public class LeituraFaturaController {

    private final LeituraFaturaService leituraFaturaService;

    public LeituraFaturaController(LeituraFaturaService leituraFaturaService) {
        this.leituraFaturaService = leituraFaturaService;
    }

    @PostMapping("/processar")
    public ProcessarFaturaResponse processar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                              @RequestParam("arquivo") MultipartFile arquivo,
                                              @RequestParam("mes") String mes) {
        return leituraFaturaService.processar(usuarioAutenticado.getId(), arquivo, mes);
    }

}
