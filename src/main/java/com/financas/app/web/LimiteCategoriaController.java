package com.financas.app.web;

import com.financas.app.dto.CategoriaResponse;
import com.financas.app.dto.LimiteCategoriaRequest;
import com.financas.app.dto.LimiteCategoriaResponse;
import com.financas.app.dto.StatusLimiteResponse;
import com.financas.app.model.Categoria;
import com.financas.app.model.LimiteCategoria;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.LimiteCategoriaService;
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
@RequestMapping("/api/limites-categoria")
public class LimiteCategoriaController {

    private final LimiteCategoriaService limiteCategoriaService;

    public LimiteCategoriaController(LimiteCategoriaService limiteCategoriaService) {
        this.limiteCategoriaService = limiteCategoriaService;
    }

    @PostMapping
    public ResponseEntity<LimiteCategoriaResponse> criar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                           @Valid @RequestBody LimiteCategoriaRequest request) {
        LimiteCategoria limiteCategoria = limiteCategoriaService.criar(usuarioAutenticado.getId(), toEntity(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(limiteCategoria));
    }

    @GetMapping
    public List<LimiteCategoriaResponse> listarPorMes(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate mesReferencia) {
        return limiteCategoriaService.listarPorMes(usuarioAutenticado.getId(), mesReferencia).stream()
                .map(LimiteCategoriaController::toResponse)
                .toList();
    }

    @GetMapping("/status")
    public StatusLimiteResponse status(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                        @RequestParam Long categoriaId,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate mesReferencia) {
        var status = limiteCategoriaService.verificarLimite(usuarioAutenticado.getId(), categoriaId, mesReferencia);
        return new StatusLimiteResponse(status.valorLimite(), status.valorGasto(), status.estourado());
    }

    @PutMapping("/{id}")
    public LimiteCategoriaResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                              @PathVariable Long id,
                                              @Valid @RequestBody LimiteCategoriaRequest request) {
        LimiteCategoria limiteCategoria = limiteCategoriaService.atualizar(usuarioAutenticado.getId(), id, toEntity(request));
        return toResponse(limiteCategoria);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                         @PathVariable Long id) {
        limiteCategoriaService.excluir(usuarioAutenticado.getId(), id);
        return ResponseEntity.noContent().build();
    }

    private static LimiteCategoria toEntity(LimiteCategoriaRequest request) {
        LimiteCategoria limiteCategoria = new LimiteCategoria();
        limiteCategoria.setValorLimite(request.valorLimite());
        limiteCategoria.setMesReferencia(request.mesReferencia());
        Categoria categoria = new Categoria();
        categoria.setId(request.categoriaId());
        limiteCategoria.setCategoria(categoria);
        return limiteCategoria;
    }

    private static LimiteCategoriaResponse toResponse(LimiteCategoria limiteCategoria) {
        var categoria = limiteCategoria.getCategoria();
        var categoriaResponse = new CategoriaResponse(categoria.getId(), categoria.getNome());
        return new LimiteCategoriaResponse(limiteCategoria.getId(), limiteCategoria.getValorLimite(),
                limiteCategoria.getMesReferencia(), categoriaResponse);
    }

}
