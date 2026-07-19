package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.LimiteCategoria;
import com.financas.app.model.Usuario;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.LimiteCategoriaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class LimiteCategoriaService {

    private final LimiteCategoriaRepository limiteCategoriaRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final DespesaService despesaService;

    public LimiteCategoriaService(LimiteCategoriaRepository limiteCategoriaRepository,
                                   CategoriaRepository categoriaRepository,
                                   UsuarioRepository usuarioRepository,
                                   DespesaService despesaService) {
        this.limiteCategoriaRepository = limiteCategoriaRepository;
        this.categoriaRepository = categoriaRepository;
        this.usuarioRepository = usuarioRepository;
        this.despesaService = despesaService;
    }

    public LimiteCategoria criar(Long usuarioId, LimiteCategoria limiteCategoria) {
        limiteCategoria.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        limiteCategoria.setCategoria(buscarCategoriaOuFalhar(limiteCategoria.getCategoria().getId(), usuarioId));
        return limiteCategoriaRepository.save(limiteCategoria);
    }

    public List<LimiteCategoria> listarPorMes(Long usuarioId, LocalDate mesReferencia) {
        return limiteCategoriaRepository.findByUsuarioIdAndMesReferencia(usuarioId, mesReferencia);
    }

    public LimiteCategoria atualizar(Long usuarioId, Long limiteId, LimiteCategoria dadosAtualizados) {
        LimiteCategoria limiteCategoria = buscarOuFalhar(limiteId, usuarioId);
        limiteCategoria.setValorLimite(dadosAtualizados.getValorLimite());
        limiteCategoria.setMesReferencia(dadosAtualizados.getMesReferencia());
        return limiteCategoriaRepository.save(limiteCategoria);
    }

    public void excluir(Long usuarioId, Long limiteId) {
        limiteCategoriaRepository.delete(buscarOuFalhar(limiteId, usuarioId));
    }

    public StatusLimiteCategoria verificarLimite(Long usuarioId, Long categoriaId, LocalDate mesReferencia) {
        LimiteCategoria limiteCategoria = limiteCategoriaRepository
                .findByUsuarioIdAndCategoriaIdAndMesReferencia(usuarioId, categoriaId, mesReferencia)
                .orElseThrow(() -> new RecursoNaoEncontradoException("LimiteCategoria", categoriaId));

        LocalDate inicio = mesReferencia.withDayOfMonth(1);
        LocalDate fim = mesReferencia.withDayOfMonth(mesReferencia.lengthOfMonth());
        var valorGasto = despesaService.calcularTotalPorCategoriaEPeriodo(usuarioId, categoriaId, inicio, fim);

        return new StatusLimiteCategoria(limiteCategoria.getValorLimite(), valorGasto,
                valorGasto.compareTo(limiteCategoria.getValorLimite()) > 0);
    }

    private Usuario buscarUsuarioOuFalhar(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário", usuarioId));
    }

    private Categoria buscarCategoriaOuFalhar(Long categoriaId, Long usuarioId) {
        Categoria categoria = categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria", categoriaId));
        if (!categoria.getUsuario().getId().equals(usuarioId)) {
            throw new RecursoNaoEncontradoException("Categoria", categoriaId);
        }
        return categoria;
    }

    private LimiteCategoria buscarOuFalhar(Long limiteId, Long usuarioId) {
        LimiteCategoria limiteCategoria = limiteCategoriaRepository.findById(limiteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("LimiteCategoria", limiteId));
        if (!limiteCategoria.getUsuario().getId().equals(usuarioId)) {
            throw new RecursoNaoEncontradoException("LimiteCategoria", limiteId);
        }
        return limiteCategoria;
    }

}
