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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

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
        Long usuarioId = usuarioAutenticado.getId();
        Map<Long, Long> contagens = categoriaService.contarDespesasPorCategoria(usuarioId);
        return categoriaService.listarPorUsuario(usuarioId).stream()
                .map(c -> toResponse(c, contagens.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    // Categorias do usuário com nome parecido ao informado (busca por
    // similaridade, pg_trgm) — usado pra avisar antes de criar uma possível
    // duplicata, nos pontos onde uma categoria nova pode ser criada.
    @GetMapping("/semelhantes")
    public List<CategoriaResponse> semelhantes(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                @RequestParam String nome) {
        return categoriaService.buscarSemelhantes(usuarioAutenticado.getId(), nome).stream()
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
                                         @PathVariable Long id,
                                         @RequestParam(defaultValue = "false") boolean cascata) {
        categoriaService.excluir(usuarioAutenticado.getId(), id, cascata);
        return ResponseEntity.noContent().build();
    }

    private static Categoria toEntity(CategoriaRequest request) {
        Categoria categoria = new Categoria();
        categoria.setNome(request.nome());
        categoria.setTipo(request.tipo());
        return categoria;
    }

    private static CategoriaResponse toResponse(Categoria categoria) {
        return toResponse(categoria, 0L);
    }

    private static CategoriaResponse toResponse(Categoria categoria, long totalDespesas) {
        return new CategoriaResponse(categoria.getId(), categoria.getNome(), categoria.getTipo(), totalDespesas,
                categoria.getDataCriacao());
    }

}
