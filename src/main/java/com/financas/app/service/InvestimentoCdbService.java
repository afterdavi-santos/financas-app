package com.financas.app.service;

import com.financas.app.dto.InvestimentoCdbResponse;
import com.financas.app.dto.PosicaoCdbResponse;
import com.financas.app.dto.SimulacaoResgateResponse;
import com.financas.app.exception.OperacaoInvalidaException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.AporteCdb;
import com.financas.app.model.InvestimentoCdb;
import com.financas.app.model.Objetivo;
import com.financas.app.model.Renda;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoRenda;
import com.financas.app.repository.AporteCdbRepository;
import com.financas.app.repository.InvestimentoCdbRepository;
import com.financas.app.repository.ObjetivoRepository;
import com.financas.app.repository.RendaRepository;
import com.financas.app.repository.UsuarioRepository;
import com.financas.app.util.ImpostosCdb;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

// Investimento CDB fica FORA de Renda de propósito: só passa a valer como
// renda do mês (e só então soma no total do mês) quando uma parte dele é
// efetivamente resgatada — resgate cria um lançamento de Renda automaticamente.
//
// Cada InvestimentoCdb é um CONTAINER de "lotes" (AporteCdb): o aporte
// inicial e cada "investir mais" depois viram um lote próprio, com seu
// PRÓPRIO relógio de rendimento/dias — assim aportar mais dinheiro nunca
// apaga o que já tinha rendido antes. O front só vê a SOMA dos lotes.
@Service
public class InvestimentoCdbService {

    private static final BigDecimal RESIDUO_DESPREZIVEL = new BigDecimal("0.01");

    private final InvestimentoCdbRepository investimentoRepository;
    private final AporteCdbRepository aporteRepository;
    private final RendaRepository rendaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ObjetivoRepository objetivoRepository;
    private final CdiService cdiService;

    public InvestimentoCdbService(InvestimentoCdbRepository investimentoRepository, AporteCdbRepository aporteRepository,
                                  RendaRepository rendaRepository, UsuarioRepository usuarioRepository,
                                  ObjetivoRepository objetivoRepository, CdiService cdiService) {
        this.investimentoRepository = investimentoRepository;
        this.aporteRepository = aporteRepository;
        this.rendaRepository = rendaRepository;
        this.usuarioRepository = usuarioRepository;
        this.objetivoRepository = objetivoRepository;
        this.cdiService = cdiService;
    }

    public InvestimentoCdbResponse criar(Long usuarioId, String descricao, BigDecimal percentualCdi,
                                          BigDecimal valorAplicado, LocalDate dataAplicacao) {
        if (dataAplicacao.isAfter(LocalDate.now())) {
            throw new OperacaoInvalidaException("A data de aplicação não pode ser no futuro.");
        }
        InvestimentoCdb investimento = new InvestimentoCdb();
        investimento.setDescricao(descricao);
        investimento.setPercentualCdi(percentualCdi);
        investimento.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        investimentoRepository.save(investimento);

        AporteCdb primeiroLote = new AporteCdb();
        primeiroLote.setInvestimento(investimento);
        primeiroLote.setValorAplicado(valorAplicado);
        primeiroLote.setDataAplicacao(dataAplicacao);
        aporteRepository.save(primeiroLote);

        return toResponse(investimento, List.of(primeiroLote));
    }

    public List<InvestimentoCdbResponse> listarPorUsuario(Long usuarioId) {
        return investimentoRepository.findByUsuarioIdOrderByIdAsc(usuarioId).stream()
                .map(inv -> toResponse(inv, lotesDe(inv)))
                .toList();
    }

    // Só descrição e % do CDI são editáveis: valor/data agora vivem nos
    // lotes (o inicial + cada "investir mais"), não no container.
    public InvestimentoCdbResponse atualizar(Long usuarioId, Long investimentoId, String descricao, BigDecimal percentualCdi) {
        InvestimentoCdb investimento = buscarOuFalhar(investimentoId, usuarioId);
        if (investimento.getDataResgate() != null) {
            throw new OperacaoInvalidaException("Este investimento já foi encerrado e não pode ser editado.");
        }
        investimento.setDescricao(descricao);
        investimento.setPercentualCdi(percentualCdi);
        investimentoRepository.save(investimento);
        return toResponse(investimento, lotesDe(investimento));
    }

    public void excluir(Long usuarioId, Long investimentoId) {
        InvestimentoCdb investimento = buscarOuFalhar(investimentoId, usuarioId);
        // Desvincula qualquer meta que dependesse deste investimento antes de
        // excluí-lo — sem isso, a meta ficaria referenciando um id inexistente.
        objetivoRepository.findByInvestimentoCdbId(investimentoId).ifPresent(objetivo -> {
            objetivo.setInvestimentoCdb(null);
            objetivoRepository.save(objetivo);
        });
        aporteRepository.deleteAll(lotesDe(investimento));
        investimentoRepository.delete(investimento);
    }

    // --- Vínculo com Objetivo --------------------------------------------------

    // Usado pelo ObjetivoService para validar e obter a entidade ao vincular
    // um investimento a uma meta. Investimento já resgatado não pode ser
    // vinculado (a posição ficaria travada em zero para sempre).
    public InvestimentoCdb buscarParaVinculo(Long usuarioId, Long investimentoId) {
        InvestimentoCdb investimento = buscarOuFalhar(investimentoId, usuarioId);
        if (investimento.getDataResgate() != null) {
            throw new OperacaoInvalidaException("Este investimento já foi resgatado e não pode ser vinculado a uma meta.");
        }
        return investimento;
    }

    // Posição atual (aplicado + rendimento), somando só os lotes ainda ativos.
    // Usado pelo ObjetivoService para calcular o progresso de metas vinculadas.
    public BigDecimal valorAtual(Long usuarioId, Long investimentoId) {
        InvestimentoCdb investimento = buscarOuFalhar(investimentoId, usuarioId);
        LocalDate hoje = LocalDate.now();
        BigDecimal total = BigDecimal.ZERO;
        for (AporteCdb lote : lotesAtivos(investimento)) {
            total = total.add(calcularValorAtualLote(investimento, lote, hoje));
        }
        return arredondar(total);
    }

    public PosicaoCdbResponse posicao(Long usuarioId, Long investimentoId) {
        InvestimentoCdb investimento = buscarAtivoOuFalhar(investimentoId, usuarioId);
        LocalDate hoje = LocalDate.now();
        List<AporteCdb> lotes = lotesAtivos(investimento);

        BigDecimal valorAplicadoTotal = BigDecimal.ZERO;
        BigDecimal valorAtualTotal = BigDecimal.ZERO;
        for (AporteCdb lote : lotes) {
            valorAplicadoTotal = valorAplicadoTotal.add(lote.getValorAplicado());
            valorAtualTotal = valorAtualTotal.add(calcularValorAtualLote(investimento, lote, hoje));
        }
        LocalDate dataMaisAntiga = dataMaisAntiga(lotes, hoje);
        BigDecimal rendimento = valorAtualTotal.subtract(valorAplicadoTotal);

        return new PosicaoCdbResponse(
                arredondar(valorAplicadoTotal), arredondar(valorAtualTotal), arredondar(rendimento),
                (int) ChronoUnit.DAYS.between(dataMaisAntiga, hoje),
                cdiService.diasUteisComRendimento(dataMaisAntiga, hoje));
    }

    // --- Investir mais -------------------------------------------------------

    // Cria um lote NOVO, independente — NÃO mexe nos lotes já existentes, então
    // o rendimento que eles já acumularam continua intacto.
    public InvestimentoCdbResponse investirMais(Long usuarioId, Long investimentoId, BigDecimal valorAdicional) {
        InvestimentoCdb investimento = buscarAtivoOuFalhar(investimentoId, usuarioId);
        AporteCdb novoLote = new AporteCdb();
        novoLote.setInvestimento(investimento);
        novoLote.setValorAplicado(valorAdicional);
        novoLote.setDataAplicacao(LocalDate.now());
        aporteRepository.save(novoLote);
        return toResponse(investimento, lotesDe(investimento));
    }

    // --- Resgate ---------------------------------------------------------------
    // O valor que o usuário informa é o que ele quer RECEBER (líquido). Os
    // lotes são consumidos em ordem FIFO (o mais antigo primeiro).

    public SimulacaoResgateResponse simularResgate(Long usuarioId, Long investimentoId, BigDecimal valorLiquidoDesejado) {
        InvestimentoCdb investimento = buscarAtivoOuFalhar(investimentoId, usuarioId);
        return processarResgate(investimento, valorLiquidoDesejado, false, LocalDate.now(), false);
    }

    public SimulacaoResgateResponse simularResgateTotal(Long usuarioId, Long investimentoId) {
        InvestimentoCdb investimento = buscarAtivoOuFalhar(investimentoId, usuarioId);
        return processarResgate(investimento, null, true, LocalDate.now(), false);
    }

    public SimulacaoResgateResponse resgatar(Long usuarioId, Long investimentoId, BigDecimal valorLiquidoDesejado) {
        InvestimentoCdb investimento = buscarAtivoOuFalhar(investimentoId, usuarioId);
        LocalDate hoje = LocalDate.now();
        SimulacaoResgateResponse resultado = processarResgate(investimento, valorLiquidoDesejado, false, hoje, false);
        processarResgate(investimento, valorLiquidoDesejado, false, hoje, true);
        criarRendaDoResgate(investimento, resultado, hoje);
        return resultado;
    }

    public SimulacaoResgateResponse resgatarTotal(Long usuarioId, Long investimentoId) {
        InvestimentoCdb investimento = buscarAtivoOuFalhar(investimentoId, usuarioId);
        LocalDate hoje = LocalDate.now();
        SimulacaoResgateResponse resultado = processarResgate(investimento, null, true, hoje, false);
        processarResgate(investimento, null, true, hoje, true);
        criarRendaDoResgate(investimento, resultado, hoje);
        return resultado;
    }

    private void criarRendaDoResgate(InvestimentoCdb investimento, SimulacaoResgateResponse resgate, LocalDate hoje) {
        Renda renda = new Renda();
        renda.setDescricao("Resgate CDB: " + investimento.getDescricao());
        renda.setValor(resgate.valorLiquido());
        renda.setMesReferencia(hoje.withDayOfMonth(1));
        renda.setTipo(TipoRenda.RETORNO_INVESTIMENTOS);
        renda.setUsuario(investimento.getUsuario());
        rendaRepository.save(renda);
    }

    // Faz duas coisas dependendo de `total`:
    // - total=true: drena TODOS os lotes por completo (fecha o investimento).
    // - total=false: consome os lotes em ordem FIFO até entregar exatamente
    //   `valorLiquidoAlvo` líquido — o último lote tocado pode ser resgatado
    //   só parcialmente (gross-up só dentro DELE).
    // `persistir=false` só calcula (usado tanto pra simular quanto, dentro de
    // resgatar/resgatarTotal, pra VALIDAR antes de mutar qualquer lote).
    private SimulacaoResgateResponse processarResgate(InvestimentoCdb investimento, BigDecimal valorLiquidoAlvo,
                                                        boolean total, LocalDate hoje, boolean persistir) {
        List<AporteCdb> lotes = lotesAtivos(investimento);
        if (lotes.isEmpty()) {
            throw new OperacaoInvalidaException("Este investimento não tem saldo disponível para resgate.");
        }

        BigDecimal brutoTotal = BigDecimal.ZERO;
        BigDecimal valorAtualTotal = BigDecimal.ZERO;
        BigDecimal rendimentoTotal = BigDecimal.ZERO;
        BigDecimal iofTotal = BigDecimal.ZERO;
        BigDecimal irTotal = BigDecimal.ZERO;
        BigDecimal liquidoTotal = BigDecimal.ZERO;
        BigDecimal metaRestante = total ? null : valorLiquidoAlvo;
        int diasReferencia = 0;
        boolean primeiroLoteProcessado = false;

        for (AporteCdb lote : lotes) {
            BigDecimal valorAtualLote = calcularValorAtualLote(investimento, lote, hoje);
            valorAtualTotal = valorAtualTotal.add(valorAtualLote);

            if (!total && metaRestante.compareTo(RESIDUO_DESPREZIVEL) <= 0) {
                continue; // já entregamos o suficiente; só continuamos somando valorAtualTotal p/ referência
            }

            int diasLote = (int) ChronoUnit.DAYS.between(lote.getDataAplicacao(), hoje);
            if (!primeiroLoteProcessado) {
                diasReferencia = diasLote;
                primeiroLoteProcessado = true;
            }

            CalculoLote calculo;
            BigDecimal proporcaoBrutoConsumido; // fração do lote retirada, p/ reduzir o principal
            if (total) {
                calculo = calcularImpostosSobreBruto(valorAtualLote, lote.getValorAplicado(), valorAtualLote, diasLote);
                proporcaoBrutoConsumido = BigDecimal.ONE;
            } else {
                CalculoLote liquidacaoTotalDoLote = calcularImpostosSobreBruto(
                        valorAtualLote, lote.getValorAplicado(), valorAtualLote, diasLote);
                if (metaRestante.compareTo(liquidacaoTotalDoLote.liquido()) >= 0) {
                    // consome o lote inteiro e segue pro próximo
                    calculo = liquidacaoTotalDoLote;
                    proporcaoBrutoConsumido = BigDecimal.ONE;
                    metaRestante = metaRestante.subtract(liquidacaoTotalDoLote.liquido());
                } else {
                    // resgate parcial DENTRO deste lote: gross-up só nele
                    BigDecimal brutoLote = grossUp(valorAtualLote, lote.getValorAplicado(), diasLote, metaRestante);
                    if (brutoLote.compareTo(valorAtualLote) > 0) {
                        brutoLote = valorAtualLote; // guarda de arredondamento
                    }
                    calculo = calcularImpostosSobreBruto(valorAtualLote, lote.getValorAplicado(), brutoLote, diasLote);
                    proporcaoBrutoConsumido = valorAtualLote.compareTo(BigDecimal.ZERO) > 0
                            ? brutoLote.divide(valorAtualLote, 10, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    metaRestante = BigDecimal.ZERO;
                }
            }

            brutoTotal = brutoTotal.add(calculo.valorBruto());
            rendimentoTotal = rendimentoTotal.add(calculo.rendimento());
            iofTotal = iofTotal.add(calculo.iof());
            irTotal = irTotal.add(calculo.ir());
            liquidoTotal = liquidoTotal.add(calculo.liquido());

            if (persistir) {
                BigDecimal principalRetirado = lote.getValorAplicado().multiply(proporcaoBrutoConsumido);
                BigDecimal novoValorLote = lote.getValorAplicado().subtract(principalRetirado);
                lote.setValorAplicado(novoValorLote.compareTo(RESIDUO_DESPREZIVEL) <= 0
                        ? BigDecimal.ZERO : arredondar(novoValorLote));
                aporteRepository.save(lote);
            }
        }

        if (!total && metaRestante.compareTo(RESIDUO_DESPREZIVEL) > 0) {
            SimulacaoResgateResponse maximo = processarResgate(investimento, null, true, hoje, false);
            throw new OperacaoInvalidaException(
                    "Saldo insuficiente para entregar esse valor líquido. Resgatando tudo hoje, o máximo que você "
                            + "recebe é " + maximo.valorLiquido() + ".");
        }

        if (persistir) {
            boolean tudoZerado = lotesAtivos(investimento).isEmpty();
            if (tudoZerado) {
                investimento.setDataResgate(hoje);
                investimentoRepository.save(investimento);
            }
        }

        BigDecimal percentualIofEfetivo = percentualEfetivo(iofTotal, rendimentoTotal);
        BigDecimal percentualIrEfetivo = percentualEfetivo(irTotal, rendimentoTotal.subtract(iofTotal));

        return new SimulacaoResgateResponse(
                arredondar(valorAtualTotal), arredondar(brutoTotal), arredondar(rendimentoTotal), diasReferencia,
                percentualIofEfetivo, arredondar(iofTotal), percentualIrEfetivo, arredondar(irTotal),
                arredondar(liquidoTotal));
    }

    // "Gross-up" (mesma ideia do resgate de investimento único): quanto
    // precisa sair (bruto) DESTE lote pra, depois do IOF/IR sobre o
    // rendimento embutido, sobrar exatamente `valorLiquidoAlvo`.
    private BigDecimal grossUp(BigDecimal valorAtualLote, BigDecimal valorAplicadoLote, int diasLote, BigDecimal valorLiquidoAlvo) {
        BigDecimal rendimentoLote = valorAtualLote.subtract(valorAplicadoLote);
        if (rendimentoLote.compareTo(BigDecimal.ZERO) <= 0 || valorAtualLote.compareTo(BigDecimal.ZERO) <= 0) {
            return valorLiquidoAlvo;
        }
        BigDecimal iofFrac = ImpostosCdb.percentualIof(diasLote).divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
        BigDecimal irFrac = ImpostosCdb.percentualIr(diasLote).divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
        BigDecimal proporcaoRendimento = rendimentoLote.divide(valorAtualLote, 10, RoundingMode.HALF_UP);
        BigDecimal fatorImposto = iofFrac.add(BigDecimal.ONE.subtract(iofFrac).multiply(irFrac));
        BigDecimal taxaEfetiva = proporcaoRendimento.multiply(fatorImposto);
        return valorLiquidoAlvo.divide(BigDecimal.ONE.subtract(taxaEfetiva), 10, RoundingMode.HALF_UP);
    }

    // Resultado do cálculo de impostos sobre um valor BRUTO retirado de um lote.
    private record CalculoLote(BigDecimal valorBruto, BigDecimal rendimento, BigDecimal iof, BigDecimal ir, BigDecimal liquido) {
    }

    private CalculoLote calcularImpostosSobreBruto(BigDecimal valorAtualLote, BigDecimal valorAplicadoLote,
                                                     BigDecimal valorBruto, int diasLote) {
        BigDecimal rendimentoTotalLote = valorAtualLote.subtract(valorAplicadoLote);
        BigDecimal proporcao = valorAtualLote.compareTo(BigDecimal.ZERO) > 0
                ? valorBruto.divide(valorAtualLote, 10, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal rendimentoProporcional = rendimentoTotalLote.multiply(proporcao);

        BigDecimal percentualIof = ImpostosCdb.percentualIof(diasLote);
        BigDecimal iof = arredondar(rendimentoProporcional.multiply(percentualIof).divide(BigDecimal.valueOf(100)));
        BigDecimal percentualIr = ImpostosCdb.percentualIr(diasLote);
        BigDecimal ir = arredondar(rendimentoProporcional.subtract(iof).multiply(percentualIr).divide(BigDecimal.valueOf(100)));
        BigDecimal liquido = valorBruto.subtract(iof).subtract(ir);

        return new CalculoLote(arredondar(valorBruto), arredondar(rendimentoProporcional), iof, ir, arredondar(liquido));
    }

    // Percentual "efetivo" pra exibição quando o resgate cruza vários lotes
    // com dias/alíquotas diferentes: a MÉDIA ponderada pelo rendimento, não
    // um valor de tabela único (os valores em R$ são sempre exatos; isso é
    // só cosmético pro card mostrar uma porcentagem coerente com o total).
    private BigDecimal percentualEfetivo(BigDecimal imposto, BigDecimal base) {
        if (base.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return imposto.multiply(BigDecimal.valueOf(100)).divide(base, 1, RoundingMode.HALF_UP);
    }

    // Aplica o % do CDI sobre o fator acumulado no período: valorAtual =
    // aplicado * (fatorCdiAcumulado ^ (percentualCdi/100)). Fórmula padrão de
    // mercado para títulos "% do CDI".
    private BigDecimal calcularValorAtualLote(InvestimentoCdb investimento, AporteCdb lote, LocalDate dataFim) {
        BigDecimal fatorCdi = cdiService.fatorAcumulado(lote.getDataAplicacao(), dataFim);
        double expoente = investimento.getPercentualCdi().doubleValue() / 100.0;
        double fatorCdb = Math.pow(fatorCdi.doubleValue(), expoente);
        return lote.getValorAplicado().multiply(BigDecimal.valueOf(fatorCdb));
    }

    private BigDecimal arredondar(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private List<AporteCdb> lotesDe(InvestimentoCdb investimento) {
        return aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(investimento.getId());
    }

    private List<AporteCdb> lotesAtivos(InvestimentoCdb investimento) {
        return lotesDe(investimento).stream()
                .filter(l -> l.getValorAplicado().compareTo(RESIDUO_DESPREZIVEL) > 0)
                .toList();
    }

    private LocalDate dataMaisAntiga(List<AporteCdb> lotes, LocalDate padrao) {
        return lotes.stream().map(AporteCdb::getDataAplicacao).min(Comparator.naturalOrder()).orElse(padrao);
    }

    private InvestimentoCdbResponse toResponse(InvestimentoCdb investimento, List<AporteCdb> lotes) {
        BigDecimal valorAplicadoTotal = lotes.stream()
                .map(AporteCdb::getValorAplicado)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDate dataMaisAntiga = dataMaisAntiga(lotes, LocalDate.now());
        Objetivo objetivoVinculado = objetivoRepository.findByInvestimentoCdbId(investimento.getId()).orElse(null);
        return new InvestimentoCdbResponse(investimento.getId(), investimento.getDescricao(),
                arredondar(valorAplicadoTotal), investimento.getPercentualCdi(), dataMaisAntiga,
                investimento.getDataResgate(),
                objetivoVinculado != null ? objetivoVinculado.getId() : null,
                objetivoVinculado != null ? objetivoVinculado.getDescricao() : null);
    }

    private Usuario buscarUsuarioOuFalhar(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário", usuarioId));
    }

    private InvestimentoCdb buscarOuFalhar(Long investimentoId, Long usuarioId) {
        InvestimentoCdb investimento = investimentoRepository.findById(investimentoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Investimento", investimentoId));
        if (!investimento.getUsuario().getId().equals(usuarioId)) {
            throw new RecursoNaoEncontradoException("Investimento", investimentoId);
        }
        return investimento;
    }

    private InvestimentoCdb buscarAtivoOuFalhar(Long investimentoId, Long usuarioId) {
        InvestimentoCdb investimento = buscarOuFalhar(investimentoId, usuarioId);
        if (investimento.getDataResgate() != null) {
            throw new OperacaoInvalidaException("Este investimento já foi totalmente resgatado.");
        }
        return investimento;
    }

}
