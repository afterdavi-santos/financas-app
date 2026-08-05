package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.model.RecorrenciaDespesa;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoCategoria;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.DespesaRepository;
import com.financas.app.repository.DespesaSpecification;
import com.financas.app.repository.RecorrenciaDespesaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class DespesaService {

    private final DespesaRepository despesaRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final RecorrenciaDespesaRepository recorrenciaDespesaRepository;

    public DespesaService(DespesaRepository despesaRepository, CategoriaRepository categoriaRepository,
                           UsuarioRepository usuarioRepository, RecorrenciaDespesaRepository recorrenciaDespesaRepository) {
        this.despesaRepository = despesaRepository;
        this.categoriaRepository = categoriaRepository;
        this.usuarioRepository = usuarioRepository;
        this.recorrenciaDespesaRepository = recorrenciaDespesaRepository;
    }

    public Despesa criar(Long usuarioId, Despesa despesa) {
        despesa.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        Categoria categoria = buscarCategoriaOuFalhar(despesa.getCategoria().getId(), usuarioId);
        despesa.setCategoria(categoria);
        if (categoria.getTipo() == TipoCategoria.FIXA) {
            despesa.setRecorrencia(criarRecorrencia(despesa));
        }
        return despesaRepository.save(despesa);
    }

    // Nova série independente: cada criação manual numa categoria FIXA é sua
    // própria recorrência (uma categoria FIXA pode conter vários itens fixos
    // distintos, ex.: "Assinaturas" com Netflix e Spotify separados).
    private RecorrenciaDespesa criarRecorrencia(Despesa despesa) {
        RecorrenciaDespesa recorrencia = new RecorrenciaDespesa();
        recorrencia.setUsuario(despesa.getUsuario());
        recorrencia.setCategoria(despesa.getCategoria());
        recorrencia.setAtiva(true);
        recorrencia.setDataInicio(despesa.getData().withDayOfMonth(1));
        recorrencia.setDiaDoMes(despesa.getData().getDayOfMonth());
        return recorrenciaDespesaRepository.save(recorrencia);
    }

    @Transactional
    public List<Despesa> listar(Long usuarioId, Long categoriaId, TipoCategoria tipo, LocalDate inicio, LocalDate fim) {
        garantirRecorrenciasAteHoje(usuarioId);
        return despesaRepository.findAll(filtros(usuarioId, categoriaId, tipo, inicio, fim));
    }

    public Despesa atualizar(Long usuarioId, Long despesaId, Despesa dadosAtualizados) {
        Despesa despesa = buscarOuFalhar(despesaId, usuarioId);
        despesa.setDescricao(dadosAtualizados.getDescricao());
        despesa.setValor(dadosAtualizados.getValor());
        despesa.setData(dadosAtualizados.getData());
        despesa.setCategoria(buscarCategoriaOuFalhar(dadosAtualizados.getCategoria().getId(), usuarioId));
        return despesaRepository.save(despesa);
    }

    // Exclui só esta ocorrência. Se for a mais recente de uma recorrência
    // ativa, também encerra a série (próximos meses param de ser gerados);
    // ocorrências de meses passados continuam intactas no banco.
    public void excluir(Long usuarioId, Long despesaId) {
        Despesa despesa = buscarOuFalhar(despesaId, usuarioId);
        if (despesa.getRecorrencia() != null) {
            RecorrenciaDespesa recorrencia = despesa.getRecorrencia();
            despesaRepository.findTopByRecorrenciaIdOrderByDataDesc(recorrencia.getId())
                    .filter(ultima -> ultima.getId().equals(despesa.getId()))
                    .ifPresent(ultima -> {
                        recorrencia.setAtiva(false);
                        recorrenciaDespesaRepository.save(recorrencia);
                    });
        }
        despesaRepository.delete(despesa);
    }

    @Transactional
    public BigDecimal calcularTotalPorPeriodo(Long usuarioId, LocalDate inicio, LocalDate fim) {
        garantirRecorrenciasAteHoje(usuarioId);
        return despesaRepository.findAll(filtros(usuarioId, null, null, inicio, fim)).stream()
                .map(Despesa::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public BigDecimal calcularTotalPorCategoriaEPeriodo(Long usuarioId, Long categoriaId, LocalDate inicio, LocalDate fim) {
        garantirRecorrenciasAteHoje(usuarioId);
        return despesaRepository.findAll(filtros(usuarioId, categoriaId, null, inicio, fim)).stream()
                .map(Despesa::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Catch-up preguiçoso (mesmo espírito de CdiService.garantirCache): para
    // cada recorrência ativa do usuário, gera uma Despesa real por mês
    // faltante entre a última ocorrência existente e o mês atual (inclusive),
    // copiando descricao/valor da ocorrência anterior — assim, editar a
    // última ocorrência vira a base dos próximos meses automaticamente.
    private void garantirRecorrenciasAteHoje(Long usuarioId) {
        LocalDate mesAtual = LocalDate.now().withDayOfMonth(1);
        for (RecorrenciaDespesa recorrencia : recorrenciaDespesaRepository.findByUsuarioIdAndAtivaTrue(usuarioId)) {
            Despesa ultima = despesaRepository.findTopByRecorrenciaIdOrderByDataDesc(recorrencia.getId()).orElse(null);
            if (ultima == null) {
                continue; // defensivo: não deveria acontecer (a criação sempre gera a 1ª ocorrência)
            }
            LocalDate cursor = ultima.getData().withDayOfMonth(1).plusMonths(1);
            while (!cursor.isAfter(mesAtual)) {
                int dia = Math.min(recorrencia.getDiaDoMes(), cursor.lengthOfMonth());
                Despesa nova = new Despesa();
                nova.setUsuario(ultima.getUsuario());
                nova.setCategoria(recorrencia.getCategoria());
                nova.setDescricao(ultima.getDescricao());
                nova.setValor(ultima.getValor());
                nova.setData(cursor.withDayOfMonth(dia));
                nova.setRecorrencia(recorrencia);
                ultima = despesaRepository.save(nova);
                cursor = cursor.plusMonths(1);
            }
        }
    }

    private Specification<Despesa> filtros(Long usuarioId, Long categoriaId, TipoCategoria tipo, LocalDate inicio, LocalDate fim) {
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
