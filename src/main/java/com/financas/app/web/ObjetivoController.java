package com.financas.app.web;

import com.financas.app.dto.AporteRequest;
import com.financas.app.dto.ObjetivoRequest;
import com.financas.app.dto.ObjetivoResponse;
import com.financas.app.model.Objetivo;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.ObjetivoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/objetivos")
public class ObjetivoController {

    private final ObjetivoService objetivoService;

    public ObjetivoController(ObjetivoService objetivoService) {
        this.objetivoService = objetivoService;
    }

    @PostMapping
    public ResponseEntity<ObjetivoResponse> criar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                    @Valid @RequestBody ObjetivoRequest request) {
        Objetivo objetivo = objetivoService.criar(usuarioAutenticado.getId(), toEntity(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(objetivo));
    }

    @GetMapping
    public List<ObjetivoResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        return objetivoService.listarPorUsuario(usuarioAutenticado.getId()).stream()
                .map(ObjetivoController::toResponse)
                .toList();
    }

    @PutMapping("/{id}")
    public ObjetivoResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                       @PathVariable Long id,
                                       @Valid @RequestBody ObjetivoRequest request) {
        Objetivo objetivo = objetivoService.atualizar(usuarioAutenticado.getId(), id, toEntity(request));
        return toResponse(objetivo);
    }

    @PostMapping("/{id}/aportar")
    public ObjetivoResponse aportar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                     @PathVariable Long id,
                                     @Valid @RequestBody AporteRequest request) {
        Objetivo objetivo = objetivoService.aportar(usuarioAutenticado.getId(), id, request.valor());
        return toResponse(objetivo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                         @PathVariable Long id) {
        objetivoService.excluir(usuarioAutenticado.getId(), id);
        return ResponseEntity.noContent().build();
    }

    private static Objetivo toEntity(ObjetivoRequest request) {
        Objetivo objetivo = new Objetivo();
        objetivo.setDescricao(request.descricao());
        objetivo.setValorAlvo(request.valorAlvo());
        objetivo.setDataAlvo(request.dataAlvo());
        return objetivo;
    }

    private static ObjetivoResponse toResponse(Objetivo objetivo) {
        return new ObjetivoResponse(objetivo.getId(), objetivo.getDescricao(), objetivo.getValorAlvo(),
                objetivo.getValorAtual(), objetivo.getDataAlvo());
    }

}
