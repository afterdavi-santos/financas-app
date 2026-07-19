package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoDespesa;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.DespesaRepository;
import com.financas.app.repository.DespesaSpecification;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class DespesaService {

    private final DespesaRepository despesaRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;

    public DespesaService(DespesaRepository despesaRepository, CategoriaRepository categoriaRepository,
                           UsuarioRepository usuarioRepository) {
        this.despesaRepository = despesaRepository;
        this.categoriaRepository = categoriaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public Despesa criar(Long usuarioId, Despesa despesa) {
        despesa.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        despesa.setCategoria(buscarCategoriaOuFalhar(despesa.getCategoria().getId(), usuarioId));
        return despesaRepository.save(despesa);
    }

    public List<Despesa> listar(Long usuarioId, Long categoriaId, TipoDespesa tipo, LocalDate inicio, LocalDate fim) {
        return despesaRepository.findAll(filtros(usuarioId, categoriaId, tipo, inicio, fim));
    }

    public Despesa atualizar(Long usuarioId, Long despesaId, Despesa dadosAtualizados) {
        Despesa despesa = buscarOuFalhar(despesaId, usuarioId);
        despesa.setDescricao(dadosAtualizados.getDescricao());
        despesa.setValor(dadosAtualizados.getValor());
        despesa.setData(dadosAtualizados.getData());
        despesa.setTipo(dadosAtualizados.getTipo());
        despesa.setCategoria(buscarCategoriaOuFalhar(dadosAtualizados.getCategoria().getId(), usuarioId));
        return despesaRepository.save(despesa);
    }

    public void excluir(Long usuarioId, Long despesaId) {
        despesaRepository.delete(buscarOuFalhar(despesaId, usuarioId));
    }

    public BigDecimal calcularTotalPorPeriodo(Long usuarioId, LocalDate inicio, LocalDate fim) {
        return despesaRepository.findAll(filtros(usuarioId, null, null, inicio, fim)).stream()
                .map(Despesa::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal calcularTotalPorCategoriaEPeriodo(Long usuarioId, Long categoriaId, LocalDate inicio, LocalDate fim) {
        return despesaRepository.findAll(filtros(usuarioId, categoriaId, null, inicio, fim)).stream()
                .map(Despesa::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Specification<Despesa> filtros(Long usuarioId, Long categoriaId, TipoDespesa tipo, LocalDate inicio, LocalDate fim) {
        return DespesaSpecification.comUsuario(usuarioId)
                .and(DespesaSpecification.comCategoria(categoriaId))
                .and(DespesaSpecification.comTipo(tipo))
                .and(DespesaSpecification.comPeriodo(inicio, fim));
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

    private Despesa buscarOuFalhar(Long despesaId, Long usuarioId) {
        Despesa despesa = despesaRepository.findById(despesaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Despesa", despesaId));
        if (!despesa.getUsuario().getId().equals(usuarioId)) {
            throw new RecursoNaoEncontradoException("Despesa", despesaId);
        }
        return despesa;
    }

}
