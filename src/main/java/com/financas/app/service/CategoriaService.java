package com.financas.app.service;

import com.financas.app.exception.CategoriaEmUsoException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Usuario;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.DespesaRepository;
import com.financas.app.repository.LimiteCategoriaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final DespesaRepository despesaRepository;
    private final LimiteCategoriaRepository limiteCategoriaRepository;

    public CategoriaService(
            CategoriaRepository categoriaRepository,
            UsuarioRepository usuarioRepository,
            DespesaRepository despesaRepository,
            LimiteCategoriaRepository limiteCategoriaRepository) {
        this.categoriaRepository = categoriaRepository;
        this.usuarioRepository = usuarioRepository;
        this.despesaRepository = despesaRepository;
        this.limiteCategoriaRepository = limiteCategoriaRepository;
    }

    public Categoria criar(Long usuarioId, Categoria categoria) {
        categoria.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        return categoriaRepository.save(categoria);
    }

    public List<Categoria> listarPorUsuario(Long usuarioId) {
        return categoriaRepository.findByUsuarioId(usuarioId);
    }

    public Categoria atualizar(Long usuarioId, Long categoriaId, Categoria dadosAtualizados) {
        Categoria categoria = buscarOuFalhar(categoriaId, usuarioId);
        categoria.setNome(dadosAtualizados.getNome());
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
