package com.financas.app.web;

import com.financas.app.dto.CategoriaResponse;
import com.financas.app.dto.DespesaRequest;
import com.financas.app.dto.DespesaResponse;
import com.financas.app.dto.TotalResponse;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.model.enums.TipoDespesa;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.DespesaService;
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
@RequestMapping("/api/despesas")
public class DespesaController {

    private final DespesaService despesaService;

    public DespesaController(DespesaService despesaService) {
        this.despesaService = despesaService;
    }

    @PostMapping
    public ResponseEntity<DespesaResponse> criar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                   @Valid @RequestBody DespesaRequest request) {
        Despesa despesa = despesaService.criar(usuarioAutenticado.getId(), toEntity(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(despesa));
    }

    @GetMapping
    public List<DespesaResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                         @RequestParam(required = false) Long categoriaId,
                                         @RequestParam(required = false) TipoDespesa tipo,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return despesaService.listar(usuarioAutenticado.getId(), categoriaId, tipo, inicio, fim).stream()
                .map(DespesaController::toResponse)
                .toList();
    }

    @GetMapping("/total")
    public TotalResponse total(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
                                @RequestParam(required = false) Long categoriaId) {
        var total = categoriaId == null
                ? despesaService.calcularTotalPorPeriodo(usuarioAutenticado.getId(), inicio, fim)
                : despesaService.calcularTotalPorCategoriaEPeriodo(usuarioAutenticado.getId(), categoriaId, inicio, fim);
        return new TotalResponse(total);
    }

    @PutMapping("/{id}")
    public DespesaResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                      @PathVariable Long id,
                                      @Valid @RequestBody DespesaRequest request) {
        Despesa despesa = despesaService.atualizar(usuarioAutenticado.getId(), id, toEntity(request));
        return toResponse(despesa);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                         @PathVariable Long id) {
        despesaService.excluir(usuarioAutenticado.getId(), id);
        return ResponseEntity.noContent().build();
    }

    private static Despesa toEntity(DespesaRequest request) {
        Despesa despesa = new Despesa();
        despesa.setDescricao(request.descricao());
        despesa.setValor(request.valor());
        despesa.setData(request.data());
        despesa.setTipo(request.tipo());
        Categoria categoria = new Categoria();
        categoria.setId(request.categoriaId());
        despesa.setCategoria(categoria);
        return despesa;
    }

    private static DespesaResponse toResponse(Despesa despesa) {
        var categoria = despesa.getCategoria();
        var categoriaResponse = new CategoriaResponse(categoria.getId(), categoria.getNome());
        return new DespesaResponse(despesa.getId(), despesa.getDescricao(), despesa.getValor(),
                despesa.getData(), despesa.getTipo(), categoriaResponse);
    }

}
