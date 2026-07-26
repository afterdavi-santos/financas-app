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
import com.financas.app.repository.AporteCdbRepository;
import com.financas.app.repository.InvestimentoCdbRepository;
import com.financas.app.repository.ObjetivoRepository;
import com.financas.app.repository.RendaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvestimentoCdbServiceTest {

    // Tolerância para conferir "recebeu o que pediu": o gross-up resolve uma
    // equação contínua, mas o cálculo final passa por arredondamentos de
    // centavo em cada etapa (IOF, IR) — pode sobrar um resíduo de 1 centavo.
    private static final Offset<BigDecimal> UM_CENTAVO = Offset.offset(new BigDecimal("0.01"));

    @Mock
    private InvestimentoCdbRepository investimentoRepository;

    @Mock
    private AporteCdbRepository aporteRepository;

    @Mock
    private RendaRepository rendaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private ObjetivoRepository objetivoRepository;

    @Mock
    private CdiService cdiService;

    private InvestimentoCdbService service;

    @BeforeEach
    void setUp() {
        service = new InvestimentoCdbService(investimentoRepository, aporteRepository, rendaRepository,
                usuarioRepository, objetivoRepository, cdiService);
    }

    private Usuario usuarioComId(Long id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }

    // percentualCdi = 100 -> expoente 1 na fórmula, matemática exata (sem
    // ruído de Math.pow) para os testes ficarem previsíveis.
    private InvestimentoCdb investimentoAtivo(Long id, Long usuarioId) {
        InvestimentoCdb investimento = new InvestimentoCdb();
        investimento.setId(id);
        investimento.setDescricao("CDB Banco XP");
        investimento.setPercentualCdi(new BigDecimal("100"));
        investimento.setUsuario(usuarioComId(usuarioId));
        return investimento;
    }

    private AporteCdb lote(Long id, InvestimentoCdb investimento, LocalDate dataAplicacao, BigDecimal valorAplicado) {
        AporteCdb lote = new AporteCdb();
        lote.setId(id);
        lote.setInvestimento(investimento);
        lote.setDataAplicacao(dataAplicacao);
        lote.setValorAplicado(valorAplicado);
        return lote;
    }

    @Test
    void deveCriarInvestimentoComPrimeiroLote() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));

        InvestimentoCdbResponse resposta = service.criar(1L, "CDB", new BigDecimal("100"),
                new BigDecimal("1000"), LocalDate.now().minusDays(1));

        assertThat(resposta.descricao()).isEqualTo("CDB");
        assertThat(resposta.valorAplicado()).isEqualByComparingTo("1000.00");
        verify(aporteRepository).save(any(AporteCdb.class));
    }

    @Test
    void deveFalharAoCriarComDataDeAplicacaoNoFuturo() {
        assertThatThrownBy(() -> service.criar(1L, "CDB", new BigDecimal("100"),
                new BigDecimal("1000"), LocalDate.now().plusDays(1)))
                .isInstanceOf(OperacaoInvalidaException.class);
        verify(investimentoRepository, never()).save(any());
    }

    @Test
    void deveFalharAoAtualizarInvestimentoJaEncerrado() {
        InvestimentoCdb encerrado = investimentoAtivo(1L, 1L);
        encerrado.setDataResgate(LocalDate.now());
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(encerrado));

        assertThatThrownBy(() -> service.atualizar(1L, 1L, "novo nome", new BigDecimal("110")))
                .isInstanceOf(OperacaoInvalidaException.class);
    }

    @Test
    void deveExcluirInvestimentoEOsLotes() {
        InvestimentoCdb inv = investimentoAtivo(1L, 1L);
        AporteCdb lote1 = lote(10L, inv, LocalDate.now().minusDays(10), new BigDecimal("1000"));
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(1L)).thenReturn(List.of(lote1));

        service.excluir(1L, 1L);

        verify(aporteRepository).deleteAll(List.of(lote1));
        verify(investimentoRepository).delete(inv);
    }

    @Test
    void deveCalcularPosicaoAtualComUmUnicoLote() {
        LocalDate hoje = LocalDate.now();
        InvestimentoCdb inv = investimentoAtivo(1L, 1L);
        AporteCdb lote1 = lote(10L, inv, hoje.minusDays(40), new BigDecimal("1000.00"));
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(1L)).thenReturn(List.of(lote1));
        when(cdiService.fatorAcumulado(lote1.getDataAplicacao(), hoje)).thenReturn(new BigDecimal("1.05"));
        when(cdiService.diasUteisComRendimento(lote1.getDataAplicacao(), hoje)).thenReturn(28);

        PosicaoCdbResponse posicao = service.posicao(1L, 1L);

        assertThat(posicao.valorAtual()).isEqualByComparingTo("1050.00");
        assertThat(posicao.rendimentoBruto()).isEqualByComparingTo("50.00");
    }

    // --- O BUG relatado: investir mais não pode apagar o rendimento anterior ---

    @Test
    void investirMaisNaoDeveApagarORendimentoJaAcumuladoNoLotePrimeiro() {
        LocalDate hoje = LocalDate.now();
        InvestimentoCdb inv = investimentoAtivo(1L, 1L);
        AporteCdb loteAntigo = lote(10L, inv, hoje.minusDays(40), new BigDecimal("1000.00"));
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(1L)).thenReturn(List.of(loteAntigo));

        service.investirMais(1L, 1L, new BigDecimal("200"));

        // O lote antigo não foi tocado: continua com seu valor e data originais.
        assertThat(loteAntigo.getValorAplicado()).isEqualByComparingTo("1000.00");
        assertThat(loteAntigo.getDataAplicacao()).isEqualTo(hoje.minusDays(40));

        // Um lote NOVO foi criado, separado, com data de hoje.
        ArgumentCaptor<AporteCdb> captor = ArgumentCaptor.forClass(AporteCdb.class);
        verify(aporteRepository).save(captor.capture());
        assertThat(captor.getValue().getValorAplicado()).isEqualByComparingTo("200.00");
        assertThat(captor.getValue().getDataAplicacao()).isEqualTo(hoje);
    }

    @Test
    void posicaoSomaOsDoisLotesEPreservaORendimentoDoLoteAntigo() {
        LocalDate hoje = LocalDate.now();
        InvestimentoCdb inv = investimentoAtivo(1L, 1L);
        AporteCdb loteAntigo = lote(10L, inv, hoje.minusDays(40), new BigDecimal("1000.00")); // já rendeu 50
        AporteCdb loteNovo = lote(11L, inv, hoje, new BigDecimal("200.00")); // acabou de entrar, ainda não rendeu
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(1L))
                .thenReturn(List.of(loteAntigo, loteNovo));
        when(cdiService.fatorAcumulado(loteAntigo.getDataAplicacao(), hoje)).thenReturn(new BigDecimal("1.05"));
        when(cdiService.fatorAcumulado(loteNovo.getDataAplicacao(), hoje)).thenReturn(BigDecimal.ONE);
        when(cdiService.diasUteisComRendimento(any(), eq(hoje))).thenReturn(1);

        PosicaoCdbResponse posicao = service.posicao(1L, 1L);

        assertThat(posicao.valorAplicado()).isEqualByComparingTo("1200.00"); // 1000 + 200
        assertThat(posicao.valorAtual()).isEqualByComparingTo("1250.00"); // 1050 (antigo) + 200 (novo, sem render ainda)
        assertThat(posicao.rendimentoBruto()).isEqualByComparingTo("50.00"); // só o do lote antigo — preservado!
    }

    // --- Resgate total (drena todos os lotes) ---

    @Test
    void deveResgatarTotalDrenandoTodosOsLotesEEncerrarOInvestimento() {
        LocalDate hoje = LocalDate.now();
        InvestimentoCdb inv = investimentoAtivo(1L, 1L);
        AporteCdb lote1 = lote(10L, inv, hoje.minusDays(40), new BigDecimal("1000.00")); // sem IOF, IR 22,5%
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(1L)).thenReturn(List.of(lote1));
        when(cdiService.fatorAcumulado(lote1.getDataAplicacao(), hoje)).thenReturn(new BigDecimal("1.05"));

        SimulacaoResgateResponse resultado = service.resgatarTotal(1L, 1L);

        assertThat(resultado.valorLiquido()).isEqualByComparingTo("1038.75"); // 1050 - 11.25 de IR
        assertThat(lote1.getValorAplicado()).isEqualByComparingTo("0");
        assertThat(inv.getDataResgate()).isEqualTo(hoje);
        verify(rendaRepository).save(any(Renda.class));
    }

    // --- Resgate parcial (gross-up), FIFO entre lotes ---

    @Test
    void deveReceberExatamenteOValorLiquidoPedidoComUmUnicoLote() {
        LocalDate hoje = LocalDate.now();
        InvestimentoCdb inv = investimentoAtivo(1L, 1L);
        AporteCdb lote1 = lote(10L, inv, hoje.minusDays(40), new BigDecimal("1000.00"));
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(1L)).thenReturn(List.of(lote1));
        when(cdiService.fatorAcumulado(lote1.getDataAplicacao(), hoje)).thenReturn(new BigDecimal("1.05"));

        SimulacaoResgateResponse sim = service.simularResgate(1L, 1L, new BigDecimal("500.00"));

        assertThat(sim.valorLiquido()).isCloseTo(new BigDecimal("500.00"), UM_CENTAVO);
        assertThat(sim.valorIr()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    void resgateParcialConsomeOLoteMaisAntigoPrimeiroEDepoisOMaisNovo() {
        LocalDate hoje = LocalDate.now();
        InvestimentoCdb inv = investimentoAtivo(1L, 1L);
        // Lote antigo vale exatamente 100 líquidos se totalmente resgatado (sem imposto, sem rendimento).
        AporteCdb loteAntigo = lote(10L, inv, hoje.minusDays(400), new BigDecimal("100.00"));
        AporteCdb loteNovo = lote(11L, inv, hoje.minusDays(400), new BigDecimal("100.00"));
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(1L))
                .thenReturn(List.of(loteAntigo, loteNovo));
        // Sem rendimento (fator 1.0) em nenhum dos dois -> sem imposto, líquido = bruto.
        when(cdiService.fatorAcumulado(any(), any())).thenReturn(BigDecimal.ONE);

        // Pede 150: consome o lote antigo inteiro (100) + metade do novo (50).
        SimulacaoResgateResponse resultado = service.resgatar(1L, 1L, new BigDecimal("150.00"));

        assertThat(resultado.valorLiquido()).isCloseTo(new BigDecimal("150.00"), UM_CENTAVO);
        assertThat(loteAntigo.getValorAplicado()).isEqualByComparingTo("0");
        assertThat(loteNovo.getValorAplicado()).isCloseTo(new BigDecimal("50.00"), UM_CENTAVO);
        assertThat(inv.getDataResgate()).isNull(); // ainda sobrou saldo no lote novo
    }

    @Test
    void deveFalharAoResgatarInvestimentoJaEncerrado() {
        InvestimentoCdb encerrado = investimentoAtivo(1L, 1L);
        encerrado.setDataResgate(LocalDate.now());
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(encerrado));

        assertThatThrownBy(() -> service.resgatar(1L, 1L, new BigDecimal("10")))
                .isInstanceOf(OperacaoInvalidaException.class);
        verify(rendaRepository, never()).save(any());
    }

    @Test
    void deveFalharAoBuscarInvestimentoDeOutroUsuario() {
        InvestimentoCdb deOutro = investimentoAtivo(1L, 2L);
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(deOutro));

        assertThatThrownBy(() -> service.posicao(1L, 1L))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    // --- Vínculo com Objetivo ---------------------------------------------------

    @Test
    void deveDesvincularObjetivoAoExcluirOInvestimentoVinculado() {
        InvestimentoCdb inv = investimentoAtivo(1L, 1L);
        Objetivo objetivoVinculado = new Objetivo();
        objetivoVinculado.setId(5L);
        objetivoVinculado.setInvestimentoCdb(inv);
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(1L)).thenReturn(List.of());
        when(objetivoRepository.findByInvestimentoCdbId(1L)).thenReturn(Optional.of(objetivoVinculado));

        service.excluir(1L, 1L);

        assertThat(objetivoVinculado.getInvestimentoCdb()).isNull();
        verify(objetivoRepository).save(objetivoVinculado);
        verify(investimentoRepository).delete(inv);
    }

    @Test
    void deveFalharAoVincularInvestimentoJaResgatado() {
        InvestimentoCdb encerrado = investimentoAtivo(1L, 1L);
        encerrado.setDataResgate(LocalDate.now());
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(encerrado));

        assertThatThrownBy(() -> service.buscarParaVinculo(1L, 1L))
                .isInstanceOf(OperacaoInvalidaException.class);
    }

    @Test
    void deveCalcularValorAtualParaVinculoComObjetivo() {
        LocalDate hoje = LocalDate.now();
        InvestimentoCdb inv = investimentoAtivo(1L, 1L);
        AporteCdb lote1 = lote(10L, inv, hoje.minusDays(40), new BigDecimal("1000.00"));
        when(investimentoRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(aporteRepository.findByInvestimentoIdOrderByDataAplicacaoAscIdAsc(1L)).thenReturn(List.of(lote1));
        when(cdiService.fatorAcumulado(lote1.getDataAplicacao(), hoje)).thenReturn(new BigDecimal("1.05"));

        BigDecimal valorAtual = service.valorAtual(1L, 1L);

        assertThat(valorAtual).isEqualByComparingTo("1050.00");
    }

}
