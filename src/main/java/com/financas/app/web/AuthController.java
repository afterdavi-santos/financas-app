package com.financas.app.web;

import com.financas.app.dto.LoginRequest;
import com.financas.app.dto.RegistroRequest;
import com.financas.app.dto.TokenResponse;
import com.financas.app.dto.UsuarioResponse;
import com.financas.app.model.Usuario;
import com.financas.app.security.JwtService;
import com.financas.app.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final JwtService jwtService;

    public AuthController(UsuarioService usuarioService, JwtService jwtService) {
        this.usuarioService = usuarioService;
        this.jwtService = jwtService;
    }

    @PostMapping("/registrar")
    public ResponseEntity<UsuarioResponse> registrar(@Valid @RequestBody RegistroRequest request) {
        Usuario usuario = new Usuario();
        usuario.setNome(request.nome());
        usuario.setEmail(request.email());
        usuario.setSenha(request.senha());
        // A validação (@AssertTrue) já garante aceitouTermos == true aqui,
        // mas o guard fica explícito porque é o que decide a data do aceite.
        if (request.aceitouTermos()) {
            usuario.setTermosAceitosEm(LocalDateTime.now());
        }
        Usuario criado = usuarioService.cadastrar(usuario);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new UsuarioResponse(criado.getId(), criado.getNome(), criado.getEmail()));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        Usuario usuario = usuarioService.autenticar(request.email(), request.senha());
        String token = jwtService.gerarToken(usuario.getId());
        return ResponseEntity.ok(new TokenResponse(token));
    }

}
