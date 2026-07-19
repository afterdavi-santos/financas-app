package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Objetivo;
import com.financas.app.model.Usuario;
import com.financas.app.repository.ObjetivoRepository;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ObjetivoService {

    private final ObjetivoRepository objetivoRepository;
    private final UsuarioRepository usuarioRepository;

    public ObjetivoService(ObjetivoRepository objetivoRepository, UsuarioRepository usuarioRepository) {
        this.objetivoRepository = objetivoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public Objetivo criar(Long usuarioId, Objetivo objetivo) {
        objetivo.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        if (objetivo.getValorAtual() == null) {
            objetivo.setValorAtual(BigDecimal.ZERO);
        }
        return objetivoRepository.save(objetivo);
    }

    public List<Objetivo> listarPorUsuario(Long usuarioId) {
        return objetivoRepository.findByUsuarioId(usuarioId);
    }

    public Objetivo atualizar(Long usuarioId, Long objetivoId, Objetivo dadosAtualizados) {
        Objetivo objetivo = buscarOuFalhar(objetivoId, usuarioId);
        objetivo.setDescricao(dadosAtualizados.getDescricao());
        objetivo.setValorAlvo(dadosAtualizados.getValorAlvo());
        objetivo.setDataAlvo(dadosAtualizados.getDataAlvo());
        return objetivoRepository.save(objetivo);
    }

    public void excluir(Long usuarioId, Long objetivoId) {
        objetivoRepository.delete(buscarOuFalhar(objetivoId, usuarioId));
    }

    public Objetivo aportar(Long usuarioId, Long objetivoId, BigDecimal valor) {
        Objetivo objetivo = buscarOuFalhar(objetivoId, usuarioId);
        objetivo.setValorAtual(objetivo.getValorAtual().add(valor));
        return objetivoRepository.save(objetivo);
    }

    private Usuario buscarUsuarioOuFalhar(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário", usuarioId));
    }

    private Objetivo buscarOuFalhar(Long objetivoId, Long usuarioId) {
        Objetivo objetivo = objetivoRepository.findById(objetivoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Objetivo", objetivoId));
        if (!objetivo.getUsuario().getId().equals(usuarioId)) {
            throw new RecursoNaoEncontradoException("Objetivo", objetivoId);
        }
        return objetivo;
    }

}
