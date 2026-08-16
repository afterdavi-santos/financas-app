package com.financas.app.web;

import com.financas.app.dto.AlterarSenhaRequest;
import com.financas.app.dto.AtualizarFotoRequest;
import com.financas.app.dto.AtualizarPerfilRequest;
import com.financas.app.dto.PerfilResponse;
import com.financas.app.exception.FotoInvalidaException;
import com.financas.app.model.Usuario;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Base64;

@RestController
@RequestMapping("/api/perfil")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping("/me")
    public PerfilResponse me(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        return toResponse(usuarioService.buscarPorId(usuarioAutenticado.getId()));
    }

    @PutMapping
    public PerfilResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                     @Valid @RequestBody AtualizarPerfilRequest request) {
        Usuario usuario = usuarioService.atualizarPerfil(
                usuarioAutenticado.getId(), request.nome(), request.email(), request.senhaAtual());
        return toResponse(usuario);
    }

    @PutMapping("/senha")
    public ResponseEntity<Void> alterarSenha(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                              @Valid @RequestBody AlterarSenhaRequest request) {
        usuarioService.alterarSenha(usuarioAutenticado.getId(), request.senhaAtual(), request.novaSenha());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/foto")
    public PerfilResponse atualizarFoto(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                         @Valid @RequestBody AtualizarFotoRequest request) {
        // O decoder lança IllegalArgumentException quando o texto não é base64
        // válido, e sem o catch isso sobe como 500. Mas o dado veio do cliente:
        // o certo é 400. Acontece de verdade quando o front esquece de tirar o
        // prefixo "data:image/png;base64," antes de enviar — os dois-pontos e a
        // barra não pertencem ao alfabeto base64.
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(request.fotoBase64());
        } catch (IllegalArgumentException ex) {
            throw new FotoInvalidaException("Imagem inválida: o conteúdo não está em base64.");
        }
        Usuario usuario = usuarioService.atualizarFoto(usuarioAutenticado.getId(), bytes, request.tipo());
        return toResponse(usuario);
    }

    @DeleteMapping("/foto")
    public PerfilResponse removerFoto(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        return toResponse(usuarioService.removerFoto(usuarioAutenticado.getId()));
    }

    private static PerfilResponse toResponse(Usuario usuario) {
        String fotoBase64 = usuario.getFoto() == null ? null
                : "data:" + usuario.getFotoTipo() + ";base64," + Base64.getEncoder().encodeToString(usuario.getFoto());
        return new PerfilResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(), fotoBase64);
    }

}
