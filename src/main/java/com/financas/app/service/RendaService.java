package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Renda;
import com.financas.app.model.Usuario;
import com.financas.app.repository.RendaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class RendaService {

    private final RendaRepository rendaRepository;
    private final UsuarioRepository usuarioRepository;

    public RendaService(RendaRepository rendaRepository, UsuarioRepository usuarioRepository) {
        this.rendaRepository = rendaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public Renda criar(Long usuarioId, Renda renda) {
        renda.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        return rendaRepository.save(renda);
    }

    public List<Renda> listarPorUsuario(Long usuarioId) {
        return rendaRepository.findByUsuarioId(usuarioId);
    }

    public Renda atualizar(Long usuarioId, Long rendaId, Renda dadosAtualizados) {
        Renda renda = buscarOuFalhar(rendaId, usuarioId);
        renda.setDescricao(dadosAtualizados.getDescricao());
        renda.setValor(dadosAtualizados.getValor());
        renda.setMesReferencia(dadosAtualizados.getMesReferencia());
        return rendaRepository.save(renda);
    }

    public void excluir(Long usuarioId, Long rendaId) {
        rendaRepository.delete(buscarOuFalhar(rendaId, usuarioId));
    }

    public BigDecimal calcularTotalMes(Long usuarioId, LocalDate mesReferencia) {
        return rendaRepository.findByUsuarioIdAndMesReferencia(usuarioId, mesReferencia).stream()
                .map(Renda::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Usuario buscarUsuarioOuFalhar(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário", usuarioId));
    }

    private Renda buscarOuFalhar(Long rendaId, Long usuarioId) {
        Renda renda = rendaRepository.findById(rendaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Renda", rendaId));
        if (!renda.getUsuario().getId().equals(usuarioId)) {
            throw new RecursoNaoEncontradoException("Renda", rendaId);
        }
        return renda;
    }

}
