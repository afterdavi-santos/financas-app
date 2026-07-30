package com.financas.app.web;

import com.financas.app.dto.InvestimentoCdbRequest;
import com.financas.app.dto.InvestimentoCdbResponse;
import com.financas.app.dto.InvestirMaisRequest;
import com.financas.app.dto.PosicaoCdbResponse;
import com.financas.app.dto.SimulacaoResgateRequest;
import com.financas.app.dto.SimulacaoResgateResponse;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.InvestimentoCdbService;
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
@RequestMapping("/api/investimentos-cdb")
public class InvestimentoCdbController {

    private final InvestimentoCdbService investimentoService;

    public InvestimentoCdbController(InvestimentoCdbService investimentoService) {
        this.investimentoService = investimentoService;
    }

    @PostMapping
    public ResponseEntity<InvestimentoCdbResponse> criar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                           @Valid @RequestBody InvestimentoCdbRequest request) {
        InvestimentoCdbResponse investimento = investimentoService.criar(usuarioAutenticado.getId(),
                request.descricao(), request.percentualCdi(), request.valorAplicado(), request.dataAplicacao());
        return ResponseEntity.status(HttpStatus.CREATED).body(investimento);
    }

    @GetMapping
    public List<InvestimentoCdbResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        return investimentoService.listarPorUsuario(usuarioAutenticado.getId());
    }

    // Só descrição e % do CDI são editáveis — valor/data agora vivem nos
    // lotes (aporte inicial + cada "investir mais"), não no investimento.
    @PutMapping("/{id}")
    public InvestimentoCdbResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                              @PathVariable Long id,
                                              @Valid @RequestBody InvestimentoCdbRequest request) {
        return investimentoService.atualizar(usuarioAutenticado.getId(), id, request.descricao(), request.percentualCdi());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                         @PathVariable Long id) {
        investimentoService.excluir(usuarioAutenticado.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/posicao")
    public PosicaoCdbResponse posicao(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                       @PathVariable Long id) {
        return investimentoService.posicao(usuarioAutenticado.getId(), id);
    }

    // Aporta mais dinheiro num investimento já existente — vira um lote NOVO,
    // sem mexer no rendimento que os lotes anteriores já acumularam.
    @PostMapping("/{id}/investir-mais")
    public InvestimentoCdbResponse investirMais(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                 @PathVariable Long id,
                                                 @Valid @RequestBody InvestirMaisRequest request) {
        return investimentoService.investirMais(usuarioAutenticado.getId(), id, request.valor());
    }

    // Prévia do resgate: `valor` é quanto o usuário quer RECEBER (líquido).
    // Mostra o IOF/IR correspondente sem persistir nada.
    @PostMapping("/{id}/simular-resgate")
    public SimulacaoResgateResponse simularResgate(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                     @PathVariable Long id,
                                                     @Valid @RequestBody SimulacaoResgateRequest request) {
        return investimentoService.simularResgate(usuarioAutenticado.getId(), id, request.valor());
    }

    @PostMapping("/{id}/resgatar")
    public SimulacaoResgateResponse resgatar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                              @PathVariable Long id,
                                              @Valid @RequestBody SimulacaoResgateRequest request) {
        return investimentoService.resgatar(usuarioAutenticado.getId(), id, request.valor());
    }

    // Resgate TOTAL: encerra o investimento, sem precisar informar valor.
    @PostMapping("/{id}/simular-resgate-total")
    public SimulacaoResgateResponse simularResgateTotal(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                          @PathVariable Long id) {
        return investimentoService.simularResgateTotal(usuarioAutenticado.getId(), id);
    }

    @PostMapping("/{id}/resgatar-total")
    public SimulacaoResgateResponse resgatarTotal(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                                    @PathVariable Long id) {
        return investimentoService.resgatarTotal(usuarioAutenticado.getId(), id);
    }

}
