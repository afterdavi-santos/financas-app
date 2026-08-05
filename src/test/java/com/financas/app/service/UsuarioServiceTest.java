package com.financas.app.service;

import com.financas.app.exception.CredenciaisInvalidasException;
import com.financas.app.exception.EmailJaCadastradoException;
import com.financas.app.exception.FotoInvalidaException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.exception.SenhaAtualInvalidaException;
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

    private Usuario usuarioExistente() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setNome("Davi");
        usuario.setEmail("davi@exemplo.com");
        usuario.setSenha(passwordEncoder.encode("senha123"));
        return usuario;
    }

    @Test
    void deveBuscarUsuarioPorId() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioExistente()));

        Usuario usuario = usuarioService.buscarPorId(1L);

        assertThat(usuario.getId()).isEqualTo(1L);
    }

    @Test
    void deveFalharBuscarUsuarioInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> usuarioService.buscarPorId(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deveAtualizarPerfilComSenhaCorreta() {
        Usuario existente = usuarioExistente();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(usuarioRepository.findByEmail("novo@exemplo.com")).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario atualizado = usuarioService.atualizarPerfil(1L, "Davi Novo", "novo@exemplo.com", "senha123");

        assertThat(atualizado.getNome()).isEqualTo("Davi Novo");
        assertThat(atualizado.getEmail()).isEqualTo("novo@exemplo.com");
    }

    @Test
    void devePermitirAtualizarPerfilMantendoOMesmoEmail() {
        Usuario existente = usuarioExistente();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario atualizado = usuarioService.atualizarPerfil(1L, "Davi Novo", "davi@exemplo.com", "senha123");

        assertThat(atualizado.getEmail()).isEqualTo("davi@exemplo.com");
        verify(usuarioRepository, never()).findByEmail("davi@exemplo.com");
    }

    @Test
    void deveFalharAtualizarPerfilComSenhaIncorreta() {
        Usuario existente = usuarioExistente();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));

        assertThatThrownBy(() -> usuarioService.atualizarPerfil(1L, "Davi Novo", "novo@exemplo.com", "errada"))
                .isInstanceOf(SenhaAtualInvalidaException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void deveFalharAtualizarPerfilComEmailJaUsadoPorOutroUsuario() {
        Usuario existente = usuarioExistente();
        Usuario outro = new Usuario();
        outro.setId(2L);
        outro.setEmail("ocupado@exemplo.com");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(usuarioRepository.findByEmail("ocupado@exemplo.com")).thenReturn(Optional.of(outro));

        assertThatThrownBy(() -> usuarioService.atualizarPerfil(1L, "Davi Novo", "ocupado@exemplo.com", "senha123"))
                .isInstanceOf(EmailJaCadastradoException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void deveAlterarSenhaComSenhaAtualCorreta() {
        Usuario existente = usuarioExistente();
        String senhaAntiga = existente.getSenha();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario atualizado = usuarioService.alterarSenha(1L, "senha123", "novaSenha123");

        assertThat(atualizado.getSenha()).isNotEqualTo(senhaAntiga);
        assertThat(passwordEncoder.matches("novaSenha123", atualizado.getSenha())).isTrue();
    }

    @Test
    void deveFalharAlterarSenhaComSenhaAtualIncorreta() {
        Usuario existente = usuarioExistente();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));

        assertThatThrownBy(() -> usuarioService.alterarSenha(1L, "errada", "novaSenha123"))
                .isInstanceOf(SenhaAtualInvalidaException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void deveFalharAlterarSenhaQuandoNovaSenhaIgualASenhaAtual() {
        Usuario existente = usuarioExistente();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));

        assertThatThrownBy(() -> usuarioService.alterarSenha(1L, "senha123", "senha123"))
                .isInstanceOf(com.financas.app.exception.OperacaoInvalidaException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void deveAtualizarFotoValida() {
        Usuario existente = usuarioExistente();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));
        byte[] foto = new byte[]{1, 2, 3};

        Usuario atualizado = usuarioService.atualizarFoto(1L, foto, "image/png");

        assertThat(atualizado.getFoto()).isEqualTo(foto);
        assertThat(atualizado.getFotoTipo()).isEqualTo("image/png");
    }

    @Test
    void deveFalharFotoComTipoNaoSuportado() {
        Usuario existente = usuarioExistente();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));
        byte[] foto = new byte[]{1, 2, 3};

        assertThatThrownBy(() -> usuarioService.atualizarFoto(1L, foto, "image/gif"))
                .isInstanceOf(FotoInvalidaException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void deveFalharFotoAcimaDoLimiteDeTamanho() {
        Usuario existente = usuarioExistente();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));
        byte[] fotoGrande = new byte[2 * 1024 * 1024 + 1];

        assertThatThrownBy(() -> usuarioService.atualizarFoto(1L, fotoGrande, "image/png"))
                .isInstanceOf(FotoInvalidaException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void deveRemoverFoto() {
        Usuario existente = usuarioExistente();
        existente.setFoto(new byte[]{1, 2, 3});
        existente.setFotoTipo("image/png");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario atualizado = usuarioService.removerFoto(1L);

        assertThat(atualizado.getFoto()).isNull();
        assertThat(atualizado.getFotoTipo()).isNull();
    }

}
