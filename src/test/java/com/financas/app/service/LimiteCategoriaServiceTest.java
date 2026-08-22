package com.financas.app.service;

import com.financas.app.exception.LimiteJaExisteException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.LimiteCategoria;
import com.financas.app.model.Usuario;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.LimiteCategoriaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LimiteCategoriaServiceTest {

    @Mock
    private LimiteCategoriaRepository limiteCategoriaRepository;

    @Mock
    private CategoriaRepository categoriaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private DespesaService despesaService;

    private LimiteCategoriaService limiteCategoriaService;

    private static final LocalDate MAIO = LocalDate.of(2026, 5, 1);
    private static final LocalDate JUNHO = LocalDate.of(2026, 6, 1);
    private static final LocalDate JULHO = LocalDate.of(2026, 7, 1);

    // Relógio fixo: o service usa "mês corrente" como padrão quando a chamada
    // não informa mês, e isso precisa ser determinístico no teste.
    private static final Clock RELOGIO =
            Clock.fixed(JULHO.plusDays(9).atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        limiteCategoriaService = new LimiteCategoriaService(limiteCategoriaRepository, categoriaRepository,
                usuarioRepository, despesaService, RELOGIO);
    }

    private Usuario usuarioComId(Long id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }

    private Categoria categoriaDoUsuario(Long categoriaId, Long usuarioId) {
        Categoria categoria = new Categoria();
        categoria.setId(categoriaId);
        categoria.setUsuario(usuarioComId(usuarioId));
        return categoria;
    }

    private LimiteCategoria limiteComId(Long limiteId, Long usuarioId, Long categoriaId, BigDecimal valorLimite) {
        LimiteCategoria limite = new LimiteCategoria();
        limite.setId(limiteId);
        limite.setValorLimite(valorLimite);
        limite.setUsuario(usuarioComId(usuarioId));
        limite.setCategoria(categoriaDoUsuario(categoriaId, usuarioId));
        limite.setMesInicio(MAIO);
        return limite;
    }

    private List<LimiteCategoria> capturarSaves(int quantidade) {
        ArgumentCaptor<LimiteCategoria> captor = ArgumentCaptor.forClass(LimiteCategoria.class);
        verify(limiteCategoriaRepository, times(quantidade)).save(captor.capture());
        return captor.getAllValues();
    }

    // ---- criação ----

    @Test
    void deveCriarLimiteVigenteAPartirDoMesEmFoco() {
        LimiteCategoria novo = new LimiteCategoria();
        novo.setValorLimite(new BigDecimal("500"));
        novo.setCategoria(categoriaDoUsuario(5L, 1L));

        when(limiteCategoriaRepository.existeVigenciaAlcancando(1L, 5L, JULHO)).thenReturn(false);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(limiteCategoriaRepository.save(any(LimiteCategoria.class))).thenAnswer(i -> i.getArgument(0));

        LimiteCategoria salvo = limiteCategoriaService.criar(1L, novo, JULHO);

        assertThat(salvo.getUsuario().getId()).isEqualTo(1L);
        assertThat(salvo.getCategoria().getId()).isEqualTo(5L);
        // Vigente do mês em foco em diante: nada de valer para junho pra trás.
        assertThat(salvo.getMesInicio()).isEqualTo(JULHO);
        assertThat(salvo.getMesFim()).isNull();
    }

    @Test
    void deveNormalizarQualquerDiaDoMesParaOPrimeiro() {
        LimiteCategoria novo = new LimiteCategoria();
        novo.setValorLimite(new BigDecimal("500"));
        novo.setCategoria(categoriaDoUsuario(5L, 1L));

        when(limiteCategoriaRepository.existeVigenciaAlcancando(1L, 5L, JULHO)).thenReturn(false);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(limiteCategoriaRepository.save(any(LimiteCategoria.class))).thenAnswer(i -> i.getArgument(0));

        LimiteCategoria salvo = limiteCategoriaService.criar(1L, novo, JULHO.withDayOfMonth(23));

        assertThat(salvo.getMesInicio()).isEqualTo(JULHO);
    }

    @Test
    void deveUsarMesCorrenteQuandoAChamadaNaoInformaMes() {
        LimiteCategoria novo = new LimiteCategoria();
        novo.setValorLimite(new BigDecimal("500"));
        novo.setCategoria(categoriaDoUsuario(5L, 1L));

        when(limiteCategoriaRepository.existeVigenciaAlcancando(1L, 5L, JULHO)).thenReturn(false);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(limiteCategoriaRepository.save(any(LimiteCategoria.class))).thenAnswer(i -> i.getArgument(0));

        LimiteCategoria salvo = limiteCategoriaService.criar(1L, novo, null);

        assertThat(salvo.getMesInicio()).isEqualTo(JULHO); // o mês do relógio fixo
    }

    @Test
    void deveFalharAoCriarSegundoLimiteVigenteNaMesmaCategoria() {
        LimiteCategoria novo = new LimiteCategoria();
        novo.setValorLimite(new BigDecimal("500"));
        novo.setCategoria(categoriaDoUsuario(5L, 1L));

        when(limiteCategoriaRepository.existeVigenciaAlcancando(1L, 5L, JULHO)).thenReturn(true);

        assertThatThrownBy(() -> limiteCategoriaService.criar(1L, novo, JULHO))
                .isInstanceOf(LimiteJaExisteException.class);

        verify(limiteCategoriaRepository, never()).save(any());
    }

    @Test
    void deveFalharAoCriarLimiteComCategoriaDeOutroUsuario() {
        LimiteCategoria novo = new LimiteCategoria();
        novo.setCategoria(categoriaDoUsuario(5L, 2L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 2L)));

        assertThatThrownBy(() -> limiteCategoriaService.criar(1L, novo, JULHO))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(limiteCategoriaRepository, never()).save(any());
    }

    // ---- listagem ----

    @Test
    void deveListarSomenteOsLimitesVigentesNoMes() {
        when(limiteCategoriaRepository.findVigentesNoMes(1L, JULHO))
                .thenReturn(List.of(limiteComId(1L, 1L, 5L, new BigDecimal("500"))));

        List<LimiteCategoria> limites = limiteCategoriaService.listar(1L, JULHO);

        assertThat(limites).hasSize(1);
    }

    // ---- edição ----

    @Test
    void deveEncerrarVigenciaEAbrirOutraAoTrocarOValor() {
        // O teto antigo tem que continuar valendo para os meses em que ele
        // realmente valeu: maio e junho seguem com 500, julho em diante vai a
        // 700. Sem isso, um mês que estourou o teto de 500 passaria a constar
        // como dentro de um teto de 700 que nunca existiu lá.
        LimiteCategoria vigente = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        LimiteCategoria dados = new LimiteCategoria();
        dados.setValorLimite(new BigDecimal("700"));

        when(limiteCategoriaRepository.findById(1L)).thenReturn(Optional.of(vigente));
        when(limiteCategoriaRepository.save(any(LimiteCategoria.class))).thenAnswer(i -> i.getArgument(0));

        LimiteCategoria nova = limiteCategoriaService.atualizar(1L, 1L, dados, JULHO);

        List<LimiteCategoria> salvos = capturarSaves(2);
        assertThat(salvos.get(0).getValorLimite()).isEqualByComparingTo("500");
        assertThat(salvos.get(0).getMesFim()).isEqualTo(JULHO); // fim exclusivo: junho ainda vale
        assertThat(nova.getValorLimite()).isEqualByComparingTo("700");
        assertThat(nova.getMesInicio()).isEqualTo(JULHO);
        assertThat(nova.getMesFim()).isNull();
    }

    @Test
    void deveCorrigirNoLugarQuandoEditadoNoProprioMesDeInicio() {
        // Não há passado a preservar aqui — abrir uma vigência nova geraria uma
        // de zero mês, que o CHECK do banco recusa (mesFim > mesInicio).
        LimiteCategoria vigente = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        LimiteCategoria dados = new LimiteCategoria();
        dados.setValorLimite(new BigDecimal("700"));

        when(limiteCategoriaRepository.findById(1L)).thenReturn(Optional.of(vigente));
        when(limiteCategoriaRepository.save(any(LimiteCategoria.class))).thenAnswer(i -> i.getArgument(0));

        LimiteCategoria atualizado = limiteCategoriaService.atualizar(1L, 1L, dados, MAIO);

        assertThat(atualizado.getValorLimite()).isEqualByComparingTo("700");
        assertThat(atualizado.getMesInicio()).isEqualTo(MAIO);
        assertThat(atualizado.getMesFim()).isNull();
        capturarSaves(1); // uma linha só: nenhuma vigência nova
    }

    @Test
    void deveFalharAoAtualizarLimiteDeOutroUsuario() {
        LimiteCategoria deOutroUsuario = limiteComId(1L, 2L, 5L, new BigDecimal("500"));
        when(limiteCategoriaRepository.findById(1L)).thenReturn(Optional.of(deOutroUsuario));

        assertThatThrownBy(() -> limiteCategoriaService.atualizar(1L, 1L, new LimiteCategoria(), JULHO))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(limiteCategoriaRepository, never()).save(any());
    }

    // ---- exclusão ----

    @Test
    void deveEncerrarLimiteNoMesEmFocoSemApagarOHistorico() {
        LimiteCategoria existente = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        when(limiteCategoriaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(limiteCategoriaRepository.save(any(LimiteCategoria.class))).thenAnswer(i -> i.getArgument(0));

        limiteCategoriaService.excluir(1L, 1L, JULHO);

        assertThat(existente.getMesFim()).isEqualTo(JULHO);
        verify(limiteCategoriaRepository, never()).delete(any());
    }

    @Test
    void deveApagarDeVezQuandoCriadoEExcluidoNoMesmoMes() {
        // Vigência que nunca cobriu mês nenhum: não há histórico a preservar, e
        // manter a linha só deixaria lixo invisível ocupando a categoria.
        LimiteCategoria existente = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        when(limiteCategoriaRepository.findById(1L)).thenReturn(Optional.of(existente));

        limiteCategoriaService.excluir(1L, 1L, MAIO);

        verify(limiteCategoriaRepository).delete(existente);
        verify(limiteCategoriaRepository, never()).save(any());
    }

    // ---- status ----

    @Test
    void deveVerificarLimiteNaoEstourado() {
        LimiteCategoria limite = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        when(limiteCategoriaRepository.findVigenteNoMes(1L, 5L, JULHO)).thenReturn(Optional.of(limite));
        when(despesaService.calcularTotalPorCategoriaEPeriodo(1L, 5L, JULHO, JULHO.withDayOfMonth(31)))
                .thenReturn(new BigDecimal("300"));

        StatusLimiteCategoria status = limiteCategoriaService.verificarLimite(1L, 5L, JULHO);

        assertThat(status.estourado()).isFalse();
        assertThat(status.valorGasto()).isEqualByComparingTo("300");
    }

    @Test
    void deveVerificarLimiteEstourado() {
        LimiteCategoria limite = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        when(limiteCategoriaRepository.findVigenteNoMes(1L, 5L, JULHO)).thenReturn(Optional.of(limite));
        when(despesaService.calcularTotalPorCategoriaEPeriodo(1L, 5L, JULHO, JULHO.withDayOfMonth(31)))
                .thenReturn(new BigDecimal("600"));

        StatusLimiteCategoria status = limiteCategoriaService.verificarLimite(1L, 5L, JULHO);

        assertThat(status.estourado()).isTrue();
    }

    @Test
    void naoDeveEncontrarLimiteEmMesForaDaVigencia() {
        // Junho é anterior à criação (ou posterior à exclusão): sem vigência, e
        // o front lê o 404 como "categoria sem teto neste mês".
        when(limiteCategoriaRepository.findVigenteNoMes(1L, 5L, JUNHO)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> limiteCategoriaService.verificarLimite(1L, 5L, JUNHO))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(despesaService, never())
                .calcularTotalPorCategoriaEPeriodo(any(), any(), eq(JUNHO), any());
    }

    // ---- listagem com status (mata o N+1 de rede da tela de Limites) ----

    @Test
    void deveListarComStatusNumaConsultaSoParaTodosOsLimites() {
        // O ponto do metodo: UMA consulta agregada serve todos os limites. O
        // `times(1)` abaixo e o que protege isso — voltar a somar categoria por
        // categoria faria o teste falhar, mesmo com os numeros certos na tela.
        LimiteCategoria alimentacao = limiteComId(1L, 1L, 5L, new BigDecimal("500"));
        LimiteCategoria transporte = limiteComId(2L, 1L, 7L, new BigDecimal("300"));

        when(limiteCategoriaRepository.findVigentesNoMes(1L, JULHO))
                .thenReturn(List.of(alimentacao, transporte));
        when(despesaService.somarPorCategoriaNoPeriodo(1L, JULHO, JULHO.withDayOfMonth(31)))
                .thenReturn(Map.of(5L, new BigDecimal("620"), 7L, new BigDecimal("120")));

        List<LimiteComStatus> linhas = limiteCategoriaService.listarComStatus(1L, JULHO);

        assertThat(linhas).hasSize(2);
        assertThat(linhas.get(0).valorGasto()).isEqualByComparingTo("620");
        assertThat(linhas.get(0).estourado()).isTrue();   // 620 de teto 500
        assertThat(linhas.get(1).valorGasto()).isEqualByComparingTo("120");
        assertThat(linhas.get(1).estourado()).isFalse();  // 120 de teto 300

        verify(despesaService, times(1))
                .somarPorCategoriaNoPeriodo(any(), any(), any());
    }

    @Test
    void deveTratarCategoriaSemGastoComoZero() {
        // Categoria sem despesa no mes nao aparece no resultado da consulta
        // agregada. Ausencia ali significa zero, nao "dado faltando" — se virasse
        // null, a tela quebraria ao formatar o valor.
        LimiteCategoria limite = limiteComId(1L, 1L, 5L, new BigDecimal("500"));

        when(limiteCategoriaRepository.findVigentesNoMes(1L, JULHO)).thenReturn(List.of(limite));
        when(despesaService.somarPorCategoriaNoPeriodo(1L, JULHO, JULHO.withDayOfMonth(31)))
                .thenReturn(Map.of());

        List<LimiteComStatus> linhas = limiteCategoriaService.listarComStatus(1L, JULHO);

        assertThat(linhas.get(0).valorGasto()).isEqualByComparingTo("0");
        assertThat(linhas.get(0).estourado()).isFalse();
    }

    @Test
    void naoDeveConsultarGastosQuandoNaoHaLimiteVigente() {
        // Sem limite nenhum nao ha o que somar, e a consulta agregada custaria um
        // catch-up de recorrencias a toa — que e a parte cara.
        when(limiteCategoriaRepository.findVigentesNoMes(1L, JULHO)).thenReturn(List.of());

        assertThat(limiteCategoriaService.listarComStatus(1L, JULHO)).isEmpty();

        verify(despesaService, never()).somarPorCategoriaNoPeriodo(any(), any(), any());
    }

}
