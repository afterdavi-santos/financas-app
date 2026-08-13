package com.financas.app.service;

import com.financas.app.exception.CategoriaEmUsoException;
import com.financas.app.exception.CategoriaJaExisteException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Usuario;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.ContagemCategoria;
import com.financas.app.repository.DespesaRepository;
import com.financas.app.repository.LimiteCategoriaRepository;
import com.financas.app.repository.RecorrenciaDespesaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CategoriaService {

    // Levemente acima do padrão 0.3 do pg_trgm: nomes de categoria são curtos
    // (1-2 palavras) e 0.3 tende a gerar falso positivo nesse comprimento.
    private static final double LIMIAR_SEMELHANCA = 0.35;

    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final DespesaRepository despesaRepository;
    private final LimiteCategoriaRepository limiteCategoriaRepository;
    private final RecorrenciaDespesaRepository recorrenciaDespesaRepository;

    public CategoriaService(
            CategoriaRepository categoriaRepository,
            UsuarioRepository usuarioRepository,
            DespesaRepository despesaRepository,
            LimiteCategoriaRepository limiteCategoriaRepository,
            RecorrenciaDespesaRepository recorrenciaDespesaRepository) {
        this.categoriaRepository = categoriaRepository;
        this.usuarioRepository = usuarioRepository;
        this.despesaRepository = despesaRepository;
        this.limiteCategoriaRepository = limiteCategoriaRepository;
        this.recorrenciaDespesaRepository = recorrenciaDespesaRepository;
    }

    public Categoria criar(Long usuarioId, Categoria categoria) {
        if (categoriaRepository.existsByNomeIgnoreCaseAndTipoAndUsuarioId(
                categoria.getNome(), categoria.getTipo(), usuarioId)) {
            throw new CategoriaJaExisteException();
        }
        categoria.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        categoria.setDataCriacao(LocalDateTime.now());
        return categoriaRepository.save(categoria);
    }

    public List<Categoria> listarPorUsuario(Long usuarioId) {
        return categoriaRepository.findByUsuarioId(usuarioId);
    }

    // Categorias do usuário com nome parecido (não necessariamente idêntico)
    // ao informado — usado pra avisar antes de criar uma possível duplicata.
    public List<Categoria> buscarSemelhantes(Long usuarioId, String nome) {
        buscarUsuarioOuFalhar(usuarioId);
        if (nome == null || nome.isBlank()) {
            return List.of();
        }
        return categoriaRepository.buscarSemelhantes(usuarioId, nome.trim(), LIMIAR_SEMELHANCA);
    }

    // categoriaId -> quantidade de despesas lançadas nela (todo o histórico),
    // usado pra ranquear as "mais usadas" no seletor do frontend.
    public Map<Long, Long> contarDespesasPorCategoria(Long usuarioId) {
        return despesaRepository.contarPorCategoria(usuarioId).stream()
                .collect(Collectors.toMap(ContagemCategoria::getCategoriaId, ContagemCategoria::getTotal));
    }

    public Categoria atualizar(Long usuarioId, Long categoriaId, Categoria dadosAtualizados) {
        Categoria categoria = buscarOuFalhar(categoriaId, usuarioId);
        if (categoriaRepository.existsByNomeIgnoreCaseAndTipoAndUsuarioIdAndIdNot(
                dadosAtualizados.getNome(), dadosAtualizados.getTipo(), usuarioId, categoriaId)) {
            throw new CategoriaJaExisteException();
        }
        categoria.setNome(dadosAtualizados.getNome());
        categoria.setTipo(dadosAtualizados.getTipo());
        return categoriaRepository.save(categoria);
    }

    public void excluir(Long usuarioId, Long categoriaId) {
        excluir(usuarioId, categoriaId, false);
    }

    @Transactional
    public void excluir(Long usuarioId, Long categoriaId, boolean cascata) {
        Categoria categoria = buscarOuFalhar(categoriaId, usuarioId);
        boolean emUso = despesaRepository.existsByCategoriaId(categoriaId)
                || limiteCategoriaRepository.existsByCategoriaId(categoriaId);
        if (emUso) {
            if (!cascata) {
                throw new CategoriaEmUsoException();
            }
            despesaRepository.deleteByCategoriaId(categoriaId);
            recorrenciaDespesaRepository.deleteByCategoriaId(categoriaId);
            limiteCategoriaRepository.deleteByCategoriaId(categoriaId);
        }
        categoriaRepository.delete(categoria);
    }

    private Usuario buscarUsuarioOuFalhar(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário", usuarioId));
    }

    private Categoria buscarOuFalhar(Long categoriaId, Long usuarioId) {
        Categoria categoria = categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria", categoriaId));
        if (!categoria.getUsuario().getId().equals(usuarioId)) {
            throw new RecursoNaoEncontradoException("Categoria", categoriaId);
        }
        return categoria;
    }

}
