package com.financas.app.service;

import com.financas.app.exception.OperacaoInvalidaException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.model.RecorrenciaDespesa;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.FormaPagamento;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
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

    // Devolve a PRIMEIRA parcela (a compra inteira, quando parcelas = 1). O
    // valor que chega em `despesa` e sempre o TOTAL da compra; quem divide e
    // gerarParcelas.
    @Transactional
    public Despesa criar(Long usuarioId, Despesa despesa) {
        despesa.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        Categoria categoria = buscarCategoriaOuFalhar(despesa.getCategoria().getId(), usuarioId);
        despesa.setCategoria(categoria);
        int parcelas = validarParcelamento(despesa, categoria);
        if (parcelas > 1) {
            return gerarParcelas(despesa, parcelas);
        }
        despesa.setParcelaNumero(1);
        despesa.setParcelasTotal(1);
        despesa.setParcelamentoId(null);
        if (categoria.getTipo() == TipoCategoria.FIXA) {
            despesa.setRecorrencia(criarRecorrencia(despesa));
        }
        return despesaRepository.save(despesa);
    }

    // Parcelar so faz sentido no credito, e o teto de 12 e o mesmo do
    // @Max(12) do DespesaRequest e do CHECK da V2 - repetido aqui porque o
    // service tambem e chamado pelo lote do Leitor de fatura.
    private int validarParcelamento(Despesa despesa, Categoria categoria) {
        int parcelas = despesa.getParcelasTotal() == null ? 1 : despesa.getParcelasTotal();
        if (parcelas < 1 || parcelas > 12) {
            throw new OperacaoInvalidaException("A quantidade de parcelas deve estar entre 1 e 12.");
        }
        if (parcelas > 1 && despesa.getFormaPagamento() != FormaPagamento.CREDITO) {
            throw new OperacaoInvalidaException("Só despesas no crédito podem ser parceladas.");
        }
        // Categoria FIXA e parcelamento sao duas formas incompativeis de
        // ocupar os proximos meses: a serie fixa repete sem fim, o
        // parcelamento acaba na ultima parcela. Juntas, a mesma compra cairia
        // duas vezes por mes (a parcela + a ocorrencia gerada pelo catch-up).
        // Numa categoria fixa, entao, so entra despesa de 1x - no credito ou
        // no debito. Isto e recusa explicita, nao um ajuste em silencio: se o
        // app escolhesse sozinho entre "vira fixa" e "vira parcelada", o
        // usuario descobriria a escolha meses depois, olhando o orcamento.
        if (parcelas > 1 && categoria.getTipo() == TipoCategoria.FIXA) {
            throw new OperacaoInvalidaException(
                    "Despesa de categoria fixa não pode ser parcelada: ela já se repete todo mês. "
                            + "Use 1x, ou escolha uma categoria variável.");
        }
        return parcelas;
    }

    // Uma compra em 3x vira TRES despesas, uma por mes, e nao uma linha com
    // rotulo "3x" - e isso que faz o orcamento dos proximos meses ja enxergar
    // a parcela.
    //
    // A primeira parcela e gravada sozinha antes das outras porque o id dela
    // e o que carimba o grupo (parcelamentoId), dispensando sequence propria.
    //
    // Nao trata categoria FIXA: validarParcelamento ja recusou essa
    // combinacao antes de chegar aqui.
    private Despesa gerarParcelas(Despesa base, int parcelas) {
        List<BigDecimal> valores = dividir(base.getValor(), parcelas);
        List<Despesa> salvas = new ArrayList<>();
        Despesa primeira = null;
        for (int i = 0; i < parcelas; i++) {
            Despesa parcela = i == 0 ? base : copiarPara(base, i);
            parcela.setValor(valores.get(i));
            parcela.setParcelaNumero(i + 1);
            parcela.setParcelasTotal(parcelas);
            parcela.setRecorrencia(null);
            if (i == 0) {
                primeira = despesaRepository.save(parcela);
                primeira.setParcelamentoId(primeira.getId());
                salvas.add(despesaRepository.save(primeira));
            } else {
                parcela.setParcelamentoId(primeira.getId());
                salvas.add(despesaRepository.save(parcela));
            }
        }
        return salvas.get(0);
    }

    // Parcela i+1 da compra: mesma descricao/categoria, i meses adiante.
    // plusMonths ja resolve o dia que nao existe no mes destino (31/jan + 1
    // mes = 28/fev). mesReferencia acompanha quando existe (despesa vinda do
    // Leitor de fatura); null continua null, e ai quem manda e a `data`.
    private Despesa copiarPara(Despesa base, int mesesAdiante) {
        Despesa parcela = new Despesa();
        parcela.setUsuario(base.getUsuario());
        parcela.setCategoria(base.getCategoria());
        parcela.setDescricao(base.getDescricao());
        parcela.setFormaPagamento(base.getFormaPagamento());
        parcela.setData(base.getData().plusMonths(mesesAdiante));
        if (base.getMesReferencia() != null) {
            parcela.setMesReferencia(base.getMesReferencia().plusMonths(mesesAdiante));
        }
        return parcela;
    }

    // Divide o total em N parcelas de 2 casas. O resto da divisao vai INTEIRO
    // na primeira parcela (R$ 100 em 3x = 33,34 + 33,33 + 33,33), pra que a
    // soma das parcelas seja exatamente o total desde o primeiro mes, sem
    // centavo sobrando nem faltando.
    private List<BigDecimal> dividir(BigDecimal total, int parcelas) {
        BigDecimal quantidade = BigDecimal.valueOf(parcelas);
        BigDecimal cada = total.divide(quantidade, 2, RoundingMode.DOWN);
        BigDecimal resto = total.setScale(2, RoundingMode.HALF_UP).subtract(cada.multiply(quantidade));
        List<BigDecimal> valores = new ArrayList<>();
        valores.add(cada.add(resto));
        for (int i = 1; i < parcelas; i++) {
            valores.add(cada);
        }
        return valores;
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
        despesa.setFormaPagamento(dadosAtualizados.getFormaPagamento());
        sincronizarRecorrenciaComCategoria(despesa);
        Despesa salva = despesaRepository.save(despesa);
        propagarParaIrmas(salva);
        return salva;
    }

    // Descricao, categoria e forma de pagamento sao da COMPRA, nao de uma
    // parcela: renomear "Geladeira 1/6" tem que renomear as seis. Ja valor e
    // data ficam so na parcela editada de proposito - corrigir o dia em que a
    // 3a parcela caiu, ou o valor de uma parcela especifica, e ajuste
    // pontual, e propagar isso reescreveria a divisao inteira da compra.
    //
    // Nao mexe em parcelaNumero/parcelasTotal: o numero de parcelas de uma
    // compra ja feita nao muda pela edicao de uma linha. Pra isso, exclui
    // (que apaga o grupo) e lanca de novo.
    private void propagarParaIrmas(Despesa editada) {
        if (editada.getParcelamentoId() == null) {
            return;
        }
        for (Despesa irma : despesaRepository.findByParcelamentoIdOrderByParcelaNumeroAsc(editada.getParcelamentoId())) {
            if (irma.getId().equals(editada.getId())) {
                continue;
            }
            irma.setDescricao(editada.getDescricao());
            irma.setCategoria(editada.getCategoria());
            irma.setFormaPagamento(editada.getFormaPagamento());
            despesaRepository.save(irma);
        }
    }

    // A categoria (e com ela o tipo FIXA/VARIAVEL) pode mudar na edição, e a
    // série precisa acompanhar: mover uma despesa para uma categoria FIXA sem
    // isto deixava a despesa parecendo fixa mas sem repetir nos meses
    // seguintes, e tirá-la de uma categoria FIXA mantinha a série gerando
    // ocorrências na categoria antiga.
    private void sincronizarRecorrenciaComCategoria(Despesa despesa) {
        // Mesma regra da criacao, agora na edicao: mover uma parcela para uma
        // categoria FIXA criaria a combinacao que validarParcelamento recusa.
        boolean parcelada = despesa.getParcelasTotal() != null && despesa.getParcelasTotal() > 1;
        boolean fixa = despesa.getCategoria().getTipo() == TipoCategoria.FIXA;
        if (fixa && parcelada) {
            throw new OperacaoInvalidaException(
                    "Uma compra parcelada não pode ir para uma categoria fixa. "
                            + "Escolha uma categoria variável.");
        }
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
    // Numa compra parcelada, exclui a COMPRA inteira (todas as parcelas) -
    // uma parcela isolada nao e uma despesa que exista sozinha no mundo real,
    // e deixar 1/3 e 3/3 sem a 2/3 nao descreve nada. O frontend avisa quantas
    // linhas vao junto antes de confirmar.
    @Transactional
    public void excluir(Long usuarioId, Long despesaId) {
        Despesa despesa = buscarOuFalhar(despesaId, usuarioId);
        if (despesa.getParcelamentoId() != null) {
            despesaRepository.deleteAll(
                    despesaRepository.findByParcelamentoIdOrderByParcelaNumeroAsc(despesa.getParcelamentoId()));
            return;
        }
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
