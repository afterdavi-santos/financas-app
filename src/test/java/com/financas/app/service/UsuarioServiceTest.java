package com.financas.app.service;

import com.financas.app.exception.CredenciaisInvalidasException;
import com.financas.app.exception.EmailJaCadastradoException;
import com.financas.app.model.Usuario;
import com.financas.app.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private UsuarioService usuarioService;

    @BeforeEach
    void setUp() {
        usuarioService = new UsuarioService(usuarioRepository, passwordEncoder);
    }

    @Test
    void deveCadastrarUsuarioComSenhaHasheada() {
        Usuario usuario = new Usuario();
        usuario.setEmail("teste@exemplo.com");
        usuario.setSenha("senha123");

        when(usuarioRepository.findByEmail("teste@exemplo.com")).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario salvo = usuarioService.cadastrar(usuario);

        assertThat(salvo.getSenha()).isNotEqualTo("senha123");
        assertThat(passwordEncoder.matches("senha123", salvo.getSenha())).isTrue();
        assertThat(salvo.getDataCriacao()).isNotNull();
    }

    @Test
    void deveRecusarCadastroComEmailJaExistente() {
        Usuario usuario = new Usuario();
        usuario.setEmail("teste@exemplo.com");
        usuario.setSenha("senha123");

        when(usuarioRepository.findByEmail("teste@exemplo.com")).thenReturn(Optional.of(new Usuario()));

        assertThatThrownBy(() -> usuarioService.cadastrar(usuario))
                .isInstanceOf(EmailJaCadastradoException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void deveAutenticarComCredenciaisValidas() {
        Usuario usuario = new Usuario();
        usuario.setEmail("teste@exemplo.com");
        usuario.setSenha(passwordEncoder.encode("senha123"));

        when(usuarioRepository.findByEmail("teste@exemplo.com")).thenReturn(Optional.of(usuario));

        Usuario autenticado = usuarioService.autenticar("teste@exemplo.com", "senha123");

        assertThat(autenticado).isEqualTo(usuario);
    }

    @Test
    void deveRecusarAutenticacaoComSenhaErrada() {
        Usuario usuario = new Usuario();
        usuario.setEmail("teste@exemplo.com");
        usuario.setSenha(passwordEncoder.encode("senha123"));

        when(usuarioRepository.findByEmail("teste@exemplo.com")).thenReturn(Optional.of(usuario));

        assertThatThrownBy(() -> usuarioService.autenticar("teste@exemplo.com", "senhaErrada"))
                .isInstanceOf(CredenciaisInvalidasException.class);
    }

    @Test
    void deveRecusarAutenticacaoComEmailInexistente() {
        when(usuarioRepository.findByEmail("inexistente@exemplo.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> usuarioService.autenticar("inexistente@exemplo.com", "qualquer"))
                .isInstanceOf(CredenciaisInvalidasException.class);
    }

}
