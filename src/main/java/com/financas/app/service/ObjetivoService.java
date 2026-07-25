package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Aporte;
import com.financas.app.model.Objetivo;
import com.financas.app.model.Usuario;
import com.financas.app.repository.AporteRepository;
import com.financas.app.repository.ObjetivoRepository;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class ObjetivoService {

    private final ObjetivoRepository objetivoRepository;
    private final AporteRepository aporteRepository;
    private final UsuarioRepository usuarioRepository;

    public ObjetivoService(ObjetivoRepository objetivoRepository, AporteRepository aporteRepository,
                           UsuarioRepository usuarioRepository) {
        this.objetivoRepository = objetivoRepository;
        this.aporteRepository = aporteRepository;
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
        objetivo.setIncentivo(dadosAtualizados.getIncentivo());
        objetivo.setValorAlvo(dadosAtualizados.getValorAlvo());
        objetivo.setDataAlvo(dadosAtualizados.getDataAlvo());
        return objetivoRepository.save(objetivo);
    }

    public void excluir(Long usuarioId, Long objetivoId) {
        objetivoRepository.delete(buscarOuFalhar(objetivoId, usuarioId));
    }

    // --- Aportes -------------------------------------------------------------

    public List<Aporte> listarAportes(Long usuarioId, Long objetivoId) {
        buscarOuFalhar(objetivoId, usuarioId); // garante posse do objetivo
        return aporteRepository.findByObjetivoIdOrderByDataAscIdAsc(objetivoId);
    }

    public Objetivo aportar(Long usuarioId, Long objetivoId, BigDecimal valor, LocalDate data) {
        Objetivo objetivo = buscarOuFalhar(objetivoId, usuarioId);
        Aporte aporte = new Aporte();
        aporte.setValor(valor);
        aporte.setData(data != null ? data : LocalDate.now());
        aporte.setObjetivo(objetivo);
        aporteRepository.save(aporte);
        // Ajuste por delta preserva qualquer valor legado (objetivos antigos que
        // acumularam antes de os aportes virarem registros individuais).
        objetivo.setValorAtual(objetivo.getValorAtual().add(valor));
        return objetivoRepository.save(objetivo);
    }

    public Objetivo editarAporte(Long usuarioId, Long objetivoId, Long aporteId, BigDecimal novoValor, LocalDate novaData) {
        Objetivo objetivo = buscarOuFalhar(objetivoId, usuarioId);
        Aporte aporte = buscarAporteOuFalhar(aporteId, objetivoId);
        BigDecimal delta = novoValor.subtract(aporte.getValor());
        aporte.setValor(novoValor);
        if (novaData != null) {
            aporte.setData(novaData);
        }
        aporteRepository.save(aporte);
        objetivo.setValorAtual(objetivo.getValorAtual().add(delta));
        return objetivoRepository.save(objetivo);
    }

    public Objetivo removerAporte(Long usuarioId, Long objetivoId, Long aporteId) {
        Objetivo objetivo = buscarOuFalhar(objetivoId, usuarioId);
        Aporte aporte = buscarAporteOuFalhar(aporteId, objetivoId);
        objetivo.setValorAtual(objetivo.getValorAtual().subtract(aporte.getValor()));
        aporteRepository.delete(aporte);
        return objetivoRepository.save(objetivo);
    }

    // --- Helpers -------------------------------------------------------------

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

    private Aporte buscarAporteOuFalhar(Long aporteId, Long objetivoId) {
        Aporte aporte = aporteRepository.findById(aporteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Aporte", aporteId));
        if (!aporte.getObjetivo().getId().equals(objetivoId)) {
            throw new RecursoNaoEncontradoException("Aporte", aporteId);
        }
        return aporte;
    }

}
