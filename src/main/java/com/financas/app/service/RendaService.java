package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.RecorrenciaRenda;
import com.financas.app.model.Renda;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoRenda;
import com.financas.app.repository.RecorrenciaRendaRepository;
import com.financas.app.repository.RendaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class RendaService {

    private final RendaRepository rendaRepository;
    private final UsuarioRepository usuarioRepository;
    private final RecorrenciaRendaRepository recorrenciaRendaRepository;

    public RendaService(RendaRepository rendaRepository, UsuarioRepository usuarioRepository,
                         RecorrenciaRendaRepository recorrenciaRendaRepository) {
        this.rendaRepository = rendaRepository;
        this.usuarioRepository = usuarioRepository;
        this.recorrenciaRendaRepository = recorrenciaRendaRepository;
    }

    public Renda criar(Long usuarioId, Renda renda) {
        renda.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        if (renda.getTipo() == TipoRenda.FIXA) {
            renda.setRecorrencia(criarRecorrencia(renda));
        }
        return rendaRepository.save(renda);
    }

    // Nova série independente a cada criação manual de renda FIXA (ex.: pode
    // haver mais de um "salário" fixo).
    private RecorrenciaRenda criarRecorrencia(Renda renda) {
        RecorrenciaRenda recorrencia = new RecorrenciaRenda();
        recorrencia.setUsuario(renda.getUsuario());
        recorrencia.setAtiva(true);
        recorrencia.setDataInicio(renda.getMesReferencia().withDayOfMonth(1));
        return recorrenciaRendaRepository.save(recorrencia);
    }

    @Transactional
    public List<Renda> listarPorUsuario(Long usuarioId) {
        garantirRecorrenciasAteHoje(usuarioId);
        return rendaRepository.findByUsuarioId(usuarioId);
    }

    public Renda atualizar(Long usuarioId, Long rendaId, Renda dadosAtualizados) {
        Renda renda = buscarOuFalhar(rendaId, usuarioId);
        renda.setDescricao(dadosAtualizados.getDescricao());
        renda.setValor(dadosAtualizados.getValor());
        renda.setMesReferencia(dadosAtualizados.getMesReferencia());
        renda.setTipo(dadosAtualizados.getTipo());
        return rendaRepository.save(renda);
    }

    // Exclui só esta ocorrência. Se for a mais recente de uma recorrência
    // ativa, também encerra a série; ocorrências de meses passados continuam
    // intactas no banco.
    public void excluir(Long usuarioId, Long rendaId) {
        Renda renda = buscarOuFalhar(rendaId, usuarioId);
        if (renda.getRecorrencia() != null) {
            RecorrenciaRenda recorrencia = renda.getRecorrencia();
            rendaRepository.findTopByRecorrenciaIdOrderByMesReferenciaDesc(recorrencia.getId())
                    .filter(ultima -> ultima.getId().equals(renda.getId()))
                    .ifPresent(ultima -> {
                        recorrencia.setAtiva(false);
                        recorrenciaRendaRepository.save(recorrencia);
                    });
        }
        rendaRepository.delete(renda);
    }

    @Transactional
    public BigDecimal calcularTotalMes(Long usuarioId, LocalDate mesReferencia) {
        garantirRecorrenciasAteHoje(usuarioId);
        return rendaRepository.findByUsuarioIdAndMesReferencia(usuarioId, mesReferencia).stream()
                .map(Renda::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Catch-up preguiçoso: mesma lógica de DespesaService, mas avançando
    // mesReferencia mês a mês (sempre dia 1, sem clamping de dia).
    private void garantirRecorrenciasAteHoje(Long usuarioId) {
        LocalDate mesAtual = LocalDate.now().withDayOfMonth(1);
        for (RecorrenciaRenda recorrencia : recorrenciaRendaRepository.findByUsuarioIdAndAtivaTrue(usuarioId)) {
            Renda ultima = rendaRepository.findTopByRecorrenciaIdOrderByMesReferenciaDesc(recorrencia.getId()).orElse(null);
            if (ultima == null) {
                continue; // defensivo: não deveria acontecer (a criação sempre gera a 1ª ocorrência)
            }
            LocalDate cursor = ultima.getMesReferencia().withDayOfMonth(1).plusMonths(1);
            while (!cursor.isAfter(mesAtual)) {
                Renda nova = new Renda();
                nova.setUsuario(ultima.getUsuario());
                nova.setDescricao(ultima.getDescricao());
                nova.setValor(ultima.getValor());
                nova.setMesReferencia(cursor);
                nova.setTipo(TipoRenda.FIXA);
                nova.setRecorrencia(recorrencia);
                ultima = rendaRepository.save(nova);
                cursor = cursor.plusMonths(1);
            }
        }
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
