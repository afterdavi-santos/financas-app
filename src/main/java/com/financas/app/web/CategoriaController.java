package com.financas.app.web;

import com.financas.app.dto.CategoriaRequest;
import com.financas.app.dto.CategoriaResponse;
import com.financas.app.model.Categoria;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.CategoriaService;
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
@RequestMapping("/api/categorias")
public class CategoriaController {

    private final CategoriaService categoriaService;

    public CategoriaController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    @PostMapping
    public ResponseEntity<CategoriaResponse> criar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                     @Valid @RequestBody CategoriaRequest request) {
        Categoria categoria = categoriaService.criar(usuarioAutenticado.getId(), toEntity(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(categoria));
    }

    @GetMapping
    public List<CategoriaResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        return categoriaService.listarPorUsuario(usuarioAutenticado.getId()).stream()
                .map(CategoriaController::toResponse)
                .toList();
    }

    @PutMapping("/{id}")
    public CategoriaResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                        @PathVariable Long id,
                                        @Valid @RequestBody CategoriaRequest request) {
        Categoria categoria = categoriaService.atualizar(usuarioAutenticado.getId(), id, toEntity(request));
        return toResponse(categoria);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                         @PathVariable Long id) {
        categoriaService.excluir(usuarioAutenticado.getId(), id);
        return ResponseEntity.noContent().build();
    }

    private static Categoria toEntity(CategoriaRequest request) {
        Categoria categoria = new Categoria();
        categoria.setNome(request.nome());
        return categoria;
    }

    private static CategoriaResponse toResponse(Categoria categoria) {
        return new CategoriaResponse(categoria.getId(), categoria.getNome());
    }

}
