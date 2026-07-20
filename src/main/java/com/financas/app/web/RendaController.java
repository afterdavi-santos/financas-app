package com.financas.app.web;

import com.financas.app.dto.RendaRequest;
import com.financas.app.dto.RendaResponse;
import com.financas.app.dto.TotalResponse;
import com.financas.app.model.Renda;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.RendaService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/rendas")
public class RendaController {

    private final RendaService rendaService;

    public RendaController(RendaService rendaService) {
        this.rendaService = rendaService;
    }

    @PostMapping
    public ResponseEntity<RendaResponse> criar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                @Valid @RequestBody RendaRequest request) {
        Renda renda = rendaService.criar(usuarioAutenticado.getId(), toEntity(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(renda));
    }

    @GetMapping
    public List<RendaResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        return rendaService.listarPorUsuario(usuarioAutenticado.getId()).stream()
                .map(RendaController::toResponse)
                .toList();
    }

    @GetMapping("/total")
    public TotalResponse total(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate mesReferencia) {
        return new TotalResponse(rendaService.calcularTotalMes(usuarioAutenticado.getId(), mesReferencia));
    }

    @PutMapping("/{id}")
    public RendaResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                    @PathVariable Long id,
                                    @Valid @RequestBody RendaRequest request) {
        Renda renda = rendaService.atualizar(usuarioAutenticado.getId(), id, toEntity(request));
        return toResponse(renda);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                         @PathVariable Long id) {
        rendaService.excluir(usuarioAutenticado.getId(), id);
        return ResponseEntity.noContent().build();
    }

    private static Renda toEntity(RendaRequest request) {
        Renda renda = new Renda();
        renda.setDescricao(request.descricao());
        renda.setValor(request.valor());
        renda.setMesReferencia(request.mesReferencia());
        return renda;
    }

    private static RendaResponse toResponse(Renda renda) {
        return new RendaResponse(renda.getId(), renda.getDescricao(), renda.getValor(), renda.getMesReferencia());
    }

}
