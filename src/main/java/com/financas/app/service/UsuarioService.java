package com.financas.app.service;

import com.financas.app.exception.CredenciaisInvalidasException;
import com.financas.app.exception.EmailJaCadastradoException;
import com.financas.app.exception.FotoInvalidaException;
import com.financas.app.exception.OperacaoInvalidaException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.exception.SenhaAtualInvalidaException;
import com.financas.app.model.Usuario;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;

@Service
public class UsuarioService {

    private static final int TAMANHO_MAXIMO_FOTO_BYTES = 2 * 1024 * 1024;
    private static final Set<String> TIPOS_FOTO_PERMITIDOS = Set.of("image/png", "image/jpeg");

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Usuario cadastrar(Usuario usuario) {
        if (usuarioRepository.findByEmail(usuario.getEmail()).isPresent()) {
            throw new EmailJaCadastradoException(usuario.getEmail());
        }
        usuario.setSenha(passwordEncoder.encode(usuario.getSenha()));
        usuario.setDataCriacao(LocalDateTime.now());
        return usuarioRepository.save(usuario);
    }

    public Usuario autenticar(String email, String senha) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(CredenciaisInvalidasException::new);
        if (!passwordEncoder.matches(senha, usuario.getSenha())) {
            throw new CredenciaisInvalidasException();
        }
        return usuario;
    }

    public Usuario buscarPorId(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário", usuarioId));
    }

    public Usuario atualizarPerfil(Long usuarioId, String nome, String email, String senhaAtual) {
        Usuario usuario = buscarPorId(usuarioId);
        validarSenhaAtual(usuario, senhaAtual);
        if (!usuario.getEmail().equalsIgnoreCase(email) && usuarioRepository.findByEmail(email).isPresent()) {
            throw new EmailJaCadastradoException(email);
        }
        usuario.setNome(nome);
        usuario.setEmail(email);
        return usuarioRepository.save(usuario);
    }

    public Usuario alterarSenha(Long usuarioId, String senhaAtual, String novaSenha) {
        Usuario usuario = buscarPorId(usuarioId);
        validarSenhaAtual(usuario, senhaAtual);
        if (senhaAtual.equals(novaSenha)) {
            throw new OperacaoInvalidaException("A nova senha não pode ser igual à senha atual.");
        }
        usuario.setSenha(passwordEncoder.encode(novaSenha));
        return usuarioRepository.save(usuario);
    }

    public Usuario atualizarFoto(Long usuarioId, byte[] foto, String tipo) {
        Usuario usuario = buscarPorId(usuarioId);
        if (!TIPOS_FOTO_PERMITIDOS.contains(tipo)) {
            throw new FotoInvalidaException("Formato de imagem não suportado. Use PNG ou JPEG.");
        }
        if (foto.length > TAMANHO_MAXIMO_FOTO_BYTES) {
            throw new FotoInvalidaException("Imagem excede o tamanho máximo de 2MB.");
        }
        usuario.setFoto(foto);
        usuario.setFotoTipo(tipo);
        return usuarioRepository.save(usuario);
    }

    public Usuario removerFoto(Long usuarioId) {
        Usuario usuario = buscarPorId(usuarioId);
        usuario.setFoto(null);
        usuario.setFotoTipo(null);
        return usuarioRepository.save(usuario);
    }

    private void validarSenhaAtual(Usuario usuario, String senhaAtual) {
        if (!passwordEncoder.matches(senhaAtual, usuario.getSenha())) {
            throw new SenhaAtualInvalidaException();
        }
    }

}
