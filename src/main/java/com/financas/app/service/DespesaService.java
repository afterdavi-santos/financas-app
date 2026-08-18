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
import com.financas.app.util.JanelaCatchUp;
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

    // Usado pelo leitor de fatura (importação em lote): tudo ou nada — se uma
    // despesa falhar (ex.: categoria inexistente), nenhuma da leva fica
    // salva, evitando uma importação parcial. Reaproveita criar() por inteiro
    // (inclusive a recorrência automática para categoria FIXA).
    @Transactional
    public List<Despesa> criarEmLote(Long usuarioId, List<Despesa> despesas) {
        return despesas.stream().map(despesa -> criar(usuarioId, despesa)).toList();
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
        garantirRecorrencias(usuarioId, fim);
        Specification<Despesa> spec = filtros(usuarioId, categoriaId, tipo, inicio, fim);
        TetoDeListagem.conferir(despesaRepository.count(spec));
        return despesaRepository.findAll(spec);
    }

    // Mesmo espírito de listar(), mas filtra pela data REAL da compra (não
    // pelo mês efetivo) — usado só pela busca de candidatas a duplicata do
    // Leitor de fatura, onde o que importa é proximidade de data real.
    @Transactional
    public List<Despesa> listarPorDataReal(Long usuarioId, LocalDate inicio, LocalDate fim) {
        // De propósito sem passar `fim`: aqui a janela é de ±90 dias em volta
        // da fatura, e procurar duplicata não é motivo pra materializar meses
        // futuros de todas as séries fixas do usuário.
        garantirRecorrencias(usuarioId, null);
        Specification<Despesa> spec = DespesaSpecification.comUsuario(usuarioId)
                .and(DespesaSpecification.comPeriodoReal(inicio, fim));
        TetoDeListagem.conferir(despesaRepository.count(spec));
        return despesaRepository.findAll(spec);
    }

    // Note: não mexe em mesReferencia de propósito — preserva o vínculo com
    // o mês da fatura (se a despesa veio do Leitor de fatura) mesmo que o
    // usuário edite descrição/valor/data/categoria pela tela normal.
    @Transactional
    public Despesa atualizar(Long usuarioId, Long despesaId, Despesa dadosAtualizados) {
        Despesa despesa = buscarOuFalhar(despesaId, usuarioId);
        despesa.setDescricao(dadosAtualizados.getDescricao());
        despesa.setValor(dadosAtualizados.getValor());
        despesa.setData(dadosAtualizados.getData());
        despesa.setCategoria(buscarCategoriaOuFalhar(dadosAtualizados.getCategoria().getId(), usuarioId));
        sincronizarRecorrenciaComCategoria(despesa);
        return despesaRepository.save(despesa);
    }

    // A categoria (e com ela o tipo FIXA/VARIAVEL) pode mudar na edição, e a
    // série precisa acompanhar: mover uma despesa para uma categoria FIXA sem
    // isto deixava a despesa parecendo fixa mas sem repetir nos meses
    // seguintes, e tirá-la de uma categoria FIXA mantinha a série gerando
    // ocorrências na categoria antiga.
    private void sincronizarRecorrenciaComCategoria(Despesa despesa) {
        boolean fixa = despesa.getCategoria().getTipo() == TipoCategoria.FIXA;
        RecorrenciaDespesa recorrencia = despesa.getRecorrencia();
        if (fixa && recorrencia == null) {
            despesa.setRecorrencia(criarRecorrencia(despesa));
        } else if (!fixa && recorrencia != null) {
            recorrencia.setAtiva(false);
            recorrenciaDespesaRepository.save(recorrencia);
            despesa.setRecorrencia(null);
        } else if (fixa && !recorrencia.getCategoria().getId().equals(despesa.getCategoria().getId())) {
            // Trocou de uma categoria FIXA para outra: a série continua, mas os
            // próximos meses devem nascer na categoria nova.
            recorrencia.setCategoria(despesa.getCategoria());
            recorrenciaDespesaRepository.save(recorrencia);
        }
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
        garantirRecorrencias(usuarioId, fim);
        return despesaRepository.findAll(filtros(usuarioId, null, null, inicio, fim)).stream()
                .map(Despesa::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public BigDecimal calcularTotalPorCategoriaEPeriodo(Long usuarioId, Long categoriaId, LocalDate inicio, LocalDate fim) {
        garantirRecorrencias(usuarioId, fim);
        return despesaRepository.findAll(filtros(usuarioId, categoriaId, null, inicio, fim)).stream()
                .map(Despesa::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Catch-up preguiçoso (mesmo espírito de CdiService.garantirCache): para
    // cada recorrência ativa do usuário, gera uma Despesa real por mês
    // faltante entre a última ocorrência existente e o mês consultado
    // (inclusive), copiando descricao/valor da ocorrência anterior — assim,
    // editar a última ocorrência vira a base dos próximos meses
    // automaticamente. `ate` é o fim do período que a tela pediu: sem ele a
    // série parava no mês corrente e a despesa fixa sumia ao navegar para um
    // mês futuro (ver JanelaCatchUp para o teto de adiantamento).
    private void garantirRecorrencias(Long usuarioId, LocalDate ate) {
        LocalDate limite = JanelaCatchUp.limiteDeGeracao(ate);
        for (RecorrenciaDespesa recorrencia : recorrenciaDespesaRepository.travarAtivasDoUsuario(usuarioId)) {
            Despesa ultima = despesaRepository.findTopByRecorrenciaIdOrderByDataDesc(recorrencia.getId()).orElse(null);
            if (ultima == null) {
                continue; // defensivo: não deveria acontecer (a criação sempre gera a 1ª ocorrência)
            }
            LocalDate cursor = ultima.getData().withDayOfMonth(1).plusMonths(1);
            while (!cursor.isAfter(limite)) {
                int dia = Math.min(recorrencia.getDiaDoMes(), cursor.lengthOfMonth());
                Despesa nova = new Despesa();
                nova.setUsuario(ultima.getUsuario());
                nova.setCategoria(recorrencia.getCategoria());
                nova.setDescricao(ultima.getDescricao());
                nova.setValor(ultima.getValor());
                nova.setData(cursor.withDayOfMonth(dia));
                nova.setRecorrencia(recorrencia);
                ultima = salvarSeAindaNaoExiste(nova, cursor);
                cursor = cursor.plusMonths(1);
            }
        }
    }

    // Segunda linha de defesa contra duplicar a série (a primeira é o lock em
    // travarAtivasDoUsuario): cobre o caso de já existir a ocorrência do mês
    // vinda de uma execução anterior. A checagem é pelo MÊS de `data`, não pela
    // data exata — o dia pode ter sido editado, e continua sendo a ocorrência
    // daquele mês. Devolve a despesa que serve de base para o mês seguinte;
    // pulando ou gravando, descricao/valor são os mesmos.
    private Despesa salvarSeAindaNaoExiste(Despesa nova, LocalDate mes) {
        LocalDate primeiroDia = mes.withDayOfMonth(1);
        if (despesaRepository.existsByRecorrenciaIdAndDataBetween(
                nova.getRecorrencia().getId(), primeiroDia, primeiroDia.withDayOfMonth(mes.lengthOfMonth()))) {
            return nova;
        }
        return despesaRepository.save(nova);
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
