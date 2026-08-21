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
import com.financas.app.repository.RecorrenciaDespesaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
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
class DespesaServiceTest {

    @Mock
    private DespesaRepository despesaRepository;

    @Mock
    private CategoriaRepository categoriaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private RecorrenciaDespesaRepository recorrenciaDespesaRepository;

    private DespesaService despesaService;

    @BeforeEach
    void setUp() {
        despesaService = new DespesaService(despesaRepository, categoriaRepository, usuarioRepository,
                recorrenciaDespesaRepository);
    }

    private Categoria categoriaFixaDoUsuario(Long categoriaId, Long usuarioId) {
        Categoria categoria = categoriaDoUsuario(categoriaId, usuarioId);
        categoria.setTipo(TipoCategoria.FIXA);
        return categoria;
    }

    private Usuario usuarioComId(Long id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }

    private Categoria categoriaDoUsuario(Long categoriaId, Long usuarioId) {
        Categoria categoria = new Categoria();
        categoria.setId(categoriaId);
        categoria.setTipo(TipoCategoria.VARIAVEL);
        categoria.setUsuario(usuarioComId(usuarioId));
        return categoria;
    }

    private Despesa despesaComId(Long despesaId, Long usuarioId, Long categoriaId, BigDecimal valor) {
        Despesa despesa = new Despesa();
        despesa.setId(despesaId);
        despesa.setDescricao("Mercado do mes");
        despesa.setValor(valor);
        despesa.setData(LocalDate.of(2026, 7, 10));
        despesa.setUsuario(usuarioComId(usuarioId));
        despesa.setCategoria(categoriaDoUsuario(categoriaId, usuarioId));
        return despesa;
    }

    @Test
    void deveCriarDespesaComCategoriaDoUsuario() {
        Despesa nova = new Despesa();
        nova.setValor(new BigDecimal("50.00"));
        nova.setCategoria(categoriaDoUsuario(5L, 1L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa salva = despesaService.criar(1L, nova);

        assertThat(salva.getUsuario().getId()).isEqualTo(1L);
        assertThat(salva.getCategoria().getId()).isEqualTo(5L);
    }

    @Test
    void deveCriarDespesaPersistindoMesReferenciaQuandoInformado() {
        // mesReferencia só vem preenchido quando a despesa nasce do Leitor de
        // fatura — o service não altera esse valor, só persiste o que veio.
        Despesa nova = new Despesa();
        nova.setValor(new BigDecimal("50.00"));
        nova.setData(LocalDate.of(2026, 7, 20));
        nova.setMesReferencia(LocalDate.of(2026, 8, 1));
        nova.setCategoria(categoriaDoUsuario(5L, 1L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa salva = despesaService.criar(1L, nova);

        assertThat(salva.getMesReferencia()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(salva.getData()).isEqualTo(LocalDate.of(2026, 7, 20));
    }

    @Test
    void deveFalharAoCriarDespesaComCategoriaDeOutroUsuario() {
        Despesa nova = new Despesa();
        nova.setCategoria(categoriaDoUsuario(5L, 2L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 2L)));

        assertThatThrownBy(() -> despesaService.criar(1L, nova))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(despesaRepository, never()).save(any());
    }

    @Test
    void deveFalharAoCriarDespesaParaUsuarioInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> despesaService.criar(99L, new Despesa()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(despesaRepository, never()).save(any());
    }

    @Test
    void deveListarDespesasComFiltros() {
        Despesa despesa = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        when(despesaRepository.findAll(ArgumentMatchers.<Specification<Despesa>>any())).thenReturn(List.of(despesa));

        List<Despesa> resultado = despesaService.listar(1L, 5L, TipoCategoria.VARIAVEL,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));

        assertThat(resultado).containsExactly(despesa);
    }

    @Test
    void deveListarPorDataRealComFiltroDeDataRealNaoMesEfetivo() {
        Despesa despesa = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        when(despesaRepository.findAll(ArgumentMatchers.<Specification<Despesa>>any())).thenReturn(List.of(despesa));

        List<Despesa> resultado = despesaService.listarPorDataReal(1L,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));

        assertThat(resultado).containsExactly(despesa);
    }

    @Test
    void deveAtualizarDespesaDoProprioUsuario() {
        Despesa existente = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        Despesa dadosAtualizados = new Despesa();
        dadosAtualizados.setDescricao("Mercado atualizado");
        dadosAtualizados.setValor(new BigDecimal("150"));
        dadosAtualizados.setData(LocalDate.of(2026, 7, 15));
        dadosAtualizados.setCategoria(categoriaDoUsuario(5L, 1L));

        when(despesaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa atualizada = despesaService.atualizar(1L, 1L, dadosAtualizados);

        assertThat(atualizada.getDescricao()).isEqualTo("Mercado atualizado");
        assertThat(atualizada.getValor()).isEqualByComparingTo("150");
    }

    @Test
    void deveAtualizarPreservandoMesReferenciaExistente() {
        // Editar uma despesa vinda do Leitor de fatura pela tela normal não
        // pode apagar o vínculo dela com o mês da fatura (mesReferencia).
        Despesa existente = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        existente.setMesReferencia(LocalDate.of(2026, 8, 1));
        Despesa dadosAtualizados = new Despesa();
        dadosAtualizados.setDescricao("Mercado atualizado");
        dadosAtualizados.setValor(new BigDecimal("150"));
        dadosAtualizados.setData(LocalDate.of(2026, 7, 15));
        dadosAtualizados.setCategoria(categoriaDoUsuario(5L, 1L));
        // dadosAtualizados.mesReferencia fica null de propósito — simula o
        // DespesaRequest da tela normal, que nunca envia esse campo.

        when(despesaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa atualizada = despesaService.atualizar(1L, 1L, dadosAtualizados);

        assertThat(atualizada.getMesReferencia()).isEqualTo(LocalDate.of(2026, 8, 1));
    }

    @Test
    void deveFalharAoAtualizarDespesaDeOutroUsuario() {
        Despesa deOutroUsuario = despesaComId(1L, 2L, 5L, new BigDecimal("100"));
        when(despesaRepository.findById(1L)).thenReturn(Optional.of(deOutroUsuario));

        assertThatThrownBy(() -> despesaService.atualizar(1L, 1L, new Despesa()))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(despesaRepository, never()).save(any());
    }

    @Test
    void deveExcluirDespesaDoProprioUsuario() {
        Despesa existente = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        when(despesaRepository.findById(1L)).thenReturn(Optional.of(existente));

        despesaService.excluir(1L, 1L);

        verify(despesaRepository).delete(existente);
    }

    @Test
    void deveCalcularTotalPorPeriodo() {
        Despesa despesa1 = despesaComId(1L, 1L, 5L, new BigDecimal("100.00"));
        Despesa despesa2 = despesaComId(2L, 1L, 5L, new BigDecimal("50.50"));
        when(despesaRepository.findAll(ArgumentMatchers.<Specification<Despesa>>any())).thenReturn(List.of(despesa1, despesa2));

        BigDecimal total = despesaService.calcularTotalPorPeriodo(1L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));

        assertThat(total).isEqualByComparingTo("150.50");
    }

    @Test
    void deveCalcularTotalPorCategoriaEPeriodo() {
        Despesa despesa1 = despesaComId(1L, 1L, 5L, new BigDecimal("100.00"));
        Despesa despesa2 = despesaComId(2L, 1L, 5L, new BigDecimal("50.50"));
        when(despesaRepository.findAll(ArgumentMatchers.<Specification<Despesa>>any())).thenReturn(List.of(despesa1, despesa2));

        BigDecimal total = despesaService.calcularTotalPorCategoriaEPeriodo(1L, 5L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));

        assertThat(total).isEqualByComparingTo("150.50");
    }

    @Test
    void deveCriarRecorrenciaAoCriarDespesaEmCategoriaFixa() {
        Categoria categoriaFixa = categoriaFixaDoUsuario(5L, 1L);
        Despesa nova = new Despesa();
        nova.setValor(new BigDecimal("1500"));
        nova.setData(LocalDate.of(2026, 7, 31));
        nova.setCategoria(categoriaFixa);

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaFixa));
        when(recorrenciaDespesaRepository.save(any(RecorrenciaDespesa.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa salva = despesaService.criar(1L, nova);

        assertThat(salva.getRecorrencia()).isNotNull();
        assertThat(salva.getRecorrencia().isAtiva()).isTrue();
        assertThat(salva.getRecorrencia().getDataInicio()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(salva.getRecorrencia().getDiaDoMes()).isEqualTo(31);
    }

    @Test
    void naoDeveCriarRecorrenciaAoCriarDespesaEmCategoriaVariavel() {
        Despesa nova = new Despesa();
        nova.setValor(new BigDecimal("50.00"));
        nova.setData(LocalDate.of(2026, 7, 10));
        nova.setCategoria(categoriaDoUsuario(5L, 1L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa salva = despesaService.criar(1L, nova);

        assertThat(salva.getRecorrencia()).isNull();
        verify(recorrenciaDespesaRepository, never()).save(any());
    }

    @Test
    void catchUpDeveGerarDespesaParaMesFaltanteComClampingDeDia() {
        // Recorrência com diaDoMes=31: se o catch-up relesse o dia da última
        // linha gerada (que pode ter sido clampada num mês curto) em vez do
        // diaDoMes fixo da recorrência, o dia ficaria preso no valor menor
        // pra sempre. Aqui simulamos exatamente esse ponto: a última linha
        // existente já está clampada em 30 (veio de um mês de 30 dias), mas
        // o próximo mês gerado tem 31 dias e deve voltar a usar o dia 31.
        LocalDate mesAtual = LocalDate.now().withDayOfMonth(1);
        LocalDate mesPassado = mesAtual.minusMonths(1);
        Categoria categoriaFixa = categoriaFixaDoUsuario(5L, 1L);

        RecorrenciaDespesa recorrencia = new RecorrenciaDespesa();
        recorrencia.setId(10L);
        recorrencia.setUsuario(usuarioComId(1L));
        recorrencia.setCategoria(categoriaFixa);
        recorrencia.setAtiva(true);
        recorrencia.setDiaDoMes(31);

        Despesa ultima = new Despesa();
        ultima.setId(1L);
        ultima.setUsuario(usuarioComId(1L));
        ultima.setCategoria(categoriaFixa);
        ultima.setDescricao("Aluguel");
        ultima.setValor(new BigDecimal("1500"));
        ultima.setData(mesPassado.withDayOfMonth(Math.min(31, mesPassado.lengthOfMonth())));
        ultima.setRecorrencia(recorrencia);

        when(recorrenciaDespesaRepository.travarAtivasDoUsuario(1L)).thenReturn(List.of(recorrencia));
        when(despesaRepository.findTopByRecorrenciaIdOrderByDataDesc(10L)).thenReturn(Optional.of(ultima));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(despesaRepository.findAll(ArgumentMatchers.<Specification<Despesa>>any())).thenReturn(List.of(ultima));

        despesaService.listar(1L, null, null, null, null);

        ArgumentCaptor<Despesa> captor = ArgumentCaptor.forClass(Despesa.class);
        verify(despesaRepository, times(1)).save(captor.capture());
        Despesa gerada = captor.getValue();
        assertThat(gerada.getValor()).isEqualByComparingTo("1500");
        assertThat(gerada.getCategoria()).isEqualTo(categoriaFixa);
        assertThat(gerada.getData().withDayOfMonth(1)).isEqualTo(mesAtual);
        assertThat(gerada.getData().getDayOfMonth()).isEqualTo(Math.min(31, mesAtual.lengthOfMonth()));
    }

    // Série ativa cuja última ocorrência é o mês atual — base dos testes de
    // geração para meses futuros.
    private void serieAtivaAteOMesAtual() {
        LocalDate mesAtual = LocalDate.now().withDayOfMonth(1);
        Categoria categoriaFixa = categoriaFixaDoUsuario(5L, 1L);

        RecorrenciaDespesa recorrencia = new RecorrenciaDespesa();
        recorrencia.setId(10L);
        recorrencia.setUsuario(usuarioComId(1L));
        recorrencia.setCategoria(categoriaFixa);
        recorrencia.setAtiva(true);
        recorrencia.setDiaDoMes(10);

        Despesa ultima = new Despesa();
        ultima.setId(1L);
        ultima.setUsuario(usuarioComId(1L));
        ultima.setCategoria(categoriaFixa);
        ultima.setDescricao("Aluguel");
        ultima.setValor(new BigDecimal("1500"));
        ultima.setData(mesAtual.withDayOfMonth(10));
        ultima.setRecorrencia(recorrencia);

        when(recorrenciaDespesaRepository.travarAtivasDoUsuario(1L)).thenReturn(List.of(recorrencia));
        when(despesaRepository.findTopByRecorrenciaIdOrderByDataDesc(10L)).thenReturn(Optional.of(ultima));
    }

    @Test
    void catchUpDeveGerarAteOMesFuturoConsultado() {
        serieAtivaAteOMesAtual();
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));
        LocalDate daquiATresMeses = LocalDate.now().withDayOfMonth(1).plusMonths(3);

        // `fim` do período consultado é o que define até onde materializar.
        despesaService.calcularTotalPorPeriodo(1L, daquiATresMeses, daquiATresMeses.withDayOfMonth(daquiATresMeses.lengthOfMonth()));

        ArgumentCaptor<Despesa> captor = ArgumentCaptor.forClass(Despesa.class);
        verify(despesaRepository, times(3)).save(captor.capture());
        assertThat(captor.getAllValues()).extracting(d -> d.getData().withDayOfMonth(1))
                .containsExactly(daquiATresMeses.minusMonths(2), daquiATresMeses.minusMonths(1), daquiATresMeses);
    }

    @Test
    void catchUpNaoDeveGerarAlemDoTetoDeMesesFuturos() {
        serieAtivaAteOMesAtual();
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));
        LocalDate daquiADoisAnos = LocalDate.now().withDayOfMonth(1).plusMonths(24);

        despesaService.calcularTotalPorPeriodo(1L, daquiADoisAnos, daquiADoisAnos);

        verify(despesaRepository, times(12)).save(any(Despesa.class));
    }

    @Test
    void consultaAMesPassadoNaoDeveEncolherASerie() {
        serieAtivaAteOMesAtual();
        LocalDate seisMesesAtras = LocalDate.now().withDayOfMonth(1).minusMonths(6);

        despesaService.calcularTotalPorPeriodo(1L, seisMesesAtras, seisMesesAtras);

        verify(despesaRepository, never()).save(any(Despesa.class));
    }

    @Test
    void catchUpNaoDeveRegravarMesQueJaExiste() {
        serieAtivaAteOMesAtual();
        LocalDate proximoMes = LocalDate.now().withDayOfMonth(1).plusMonths(1);
        when(despesaRepository.existsByRecorrenciaIdAndDataBetween(eq(10L), eq(proximoMes), any(LocalDate.class)))
                .thenReturn(true);

        despesaService.calcularTotalPorPeriodo(1L, proximoMes, proximoMes);

        verify(despesaRepository, never()).save(any(Despesa.class));
    }

    @Test
    void editarParaCategoriaFixaDeveCriarRecorrencia() {
        Categoria categoriaFixa = categoriaFixaDoUsuario(5L, 1L);
        Despesa existente = despesaComId(1L, 1L, 9L, new BigDecimal("100"));

        Despesa dadosAtualizados = new Despesa();
        dadosAtualizados.setDescricao("Aluguel");
        dadosAtualizados.setValor(new BigDecimal("100"));
        dadosAtualizados.setData(existente.getData());
        dadosAtualizados.setCategoria(categoriaFixa);

        when(despesaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaFixa));
        when(recorrenciaDespesaRepository.save(any(RecorrenciaDespesa.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa atualizada = despesaService.atualizar(1L, 1L, dadosAtualizados);

        assertThat(atualizada.getRecorrencia()).isNotNull();
        assertThat(atualizada.getRecorrencia().isAtiva()).isTrue();
        assertThat(atualizada.getRecorrencia().getCategoria()).isEqualTo(categoriaFixa);
    }

    @Test
    void editarParaCategoriaVariavelDeveEncerrarRecorrencia() {
        Categoria categoriaVariavel = new Categoria();
        categoriaVariavel.setId(9L);
        categoriaVariavel.setTipo(TipoCategoria.VARIAVEL);
        categoriaVariavel.setUsuario(usuarioComId(1L));

        RecorrenciaDespesa recorrencia = new RecorrenciaDespesa();
        recorrencia.setId(10L);
        recorrencia.setAtiva(true);
        recorrencia.setCategoria(categoriaFixaDoUsuario(5L, 1L));

        Despesa existente = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        existente.setRecorrencia(recorrencia);

        Despesa dadosAtualizados = new Despesa();
        dadosAtualizados.setDescricao("Compra avulsa");
        dadosAtualizados.setValor(new BigDecimal("100"));
        dadosAtualizados.setData(existente.getData());
        dadosAtualizados.setCategoria(categoriaVariavel);

        when(despesaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(categoriaRepository.findById(9L)).thenReturn(Optional.of(categoriaVariavel));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Despesa atualizada = despesaService.atualizar(1L, 1L, dadosAtualizados);

        assertThat(atualizada.getRecorrencia()).isNull();
        assertThat(recorrencia.isAtiva()).isFalse();
        verify(recorrenciaDespesaRepository).save(recorrencia);
    }

    @Test
    void excluirUltimaOcorrenciaDeveDesativarRecorrencia() {
        RecorrenciaDespesa recorrencia = new RecorrenciaDespesa();
        recorrencia.setId(10L);
        recorrencia.setAtiva(true);

        Despesa existente = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        existente.setRecorrencia(recorrencia);

        when(despesaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(despesaRepository.findTopByRecorrenciaIdOrderByDataDesc(10L)).thenReturn(Optional.of(existente));

        despesaService.excluir(1L, 1L);

        assertThat(recorrencia.isAtiva()).isFalse();
        verify(recorrenciaDespesaRepository).save(recorrencia);
        verify(despesaRepository).delete(existente);
    }

    @Test
    void deveCriarVariasDespesasEmLote() {
        Despesa despesa1 = new Despesa();
        despesa1.setValor(new BigDecimal("20.00"));
        despesa1.setCategoria(categoriaDoUsuario(5L, 1L));
        Despesa despesa2 = new Despesa();
        despesa2.setValor(new BigDecimal("30.00"));
        despesa2.setCategoria(categoriaDoUsuario(5L, 1L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<Despesa> salvas = despesaService.criarEmLote(1L, List.of(despesa1, despesa2));

        assertThat(salvas).hasSize(2);
        verify(despesaRepository, times(2)).save(any(Despesa.class));
    }

    @Test
    void deveFalharLoteInteiroSeUmaDespesaTiverCategoriaInvalida() {
        Despesa valida = new Despesa();
        valida.setValor(new BigDecimal("20.00"));
        valida.setCategoria(categoriaDoUsuario(5L, 1L));
        Despesa invalida = new Despesa();
        invalida.setValor(new BigDecimal("30.00"));
        invalida.setCategoria(categoriaDoUsuario(99L, 1L));

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        when(categoriaRepository.findById(99L)).thenReturn(Optional.empty());
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThatThrownBy(() -> despesaService.criarEmLote(1L, List.of(valida, invalida)))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void excluirOcorrenciaHistoricaNaoDeveDesativarRecorrencia() {
        RecorrenciaDespesa recorrencia = new RecorrenciaDespesa();
        recorrencia.setId(10L);
        recorrencia.setAtiva(true);

        Despesa historica = despesaComId(1L, 1L, 5L, new BigDecimal("100"));
        historica.setRecorrencia(recorrencia);
        Despesa maisRecente = despesaComId(2L, 1L, 5L, new BigDecimal("100"));
        maisRecente.setData(historica.getData().plusMonths(1));
        maisRecente.setRecorrencia(recorrencia);

        when(despesaRepository.findById(1L)).thenReturn(Optional.of(historica));
        when(despesaRepository.findTopByRecorrenciaIdOrderByDataDesc(10L)).thenReturn(Optional.of(maisRecente));

        despesaService.excluir(1L, 1L);

        assertThat(recorrencia.isAtiva()).isTrue();
        verify(recorrenciaDespesaRepository, never()).save(any());
        verify(despesaRepository).delete(historica);
    }

    // ---- forma de pagamento e parcelamento ----

    // O save mockado nao gera id, e gerarParcelas depende do id da PRIMEIRA
    // parcela pra carimbar o grupo (parcelamentoId). Este stub imita a
    // sequence do banco: cada save sem id ganha o proximo.
    private long proximoIdSimulado = 100L;

    private void simularGeracaoDeId() {
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> {
            Despesa d = invocation.getArgument(0);
            if (d.getId() == null) {
                d.setId(proximoIdSimulado++);
            }
            return d;
        });
    }

    private Despesa compraNoCredito(BigDecimal total, int parcelas) {
        Despesa nova = new Despesa();
        nova.setDescricao("Geladeira");
        nova.setValor(total);
        nova.setData(LocalDate.of(2026, 8, 15));
        nova.setFormaPagamento(FormaPagamento.CREDITO);
        nova.setParcelasTotal(parcelas);
        nova.setCategoria(categoriaDoUsuario(5L, 1L));
        return nova;
    }

    private List<Despesa> capturarSaves(int quantidade) {
        ArgumentCaptor<Despesa> captor = ArgumentCaptor.forClass(Despesa.class);
        verify(despesaRepository, times(quantidade)).save(captor.capture());
        return captor.getAllValues();
    }

    @Test
    void deveGerarUmaDespesaPorParcelaAvancandoUmMesPorVez() {
        // O ponto da feature: 3x nao e um rotulo numa despesa so - sao tres
        // despesas, uma em cada mes, pra que o orcamento de setembro e outubro
        // ja contem a parcela.
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        simularGeracaoDeId();

        despesaService.criar(1L, compraNoCredito(new BigDecimal("300.00"), 3));

        // 4 saves: a 1a parcela e gravada duas vezes (a segunda so pra carimbar
        // o parcelamentoId com o proprio id dela).
        List<Despesa> parcelas = capturarSaves(4).subList(1, 4);
        assertThat(parcelas).extracting(Despesa::getData).containsExactly(
                LocalDate.of(2026, 8, 15), LocalDate.of(2026, 9, 15), LocalDate.of(2026, 10, 15));
        assertThat(parcelas).extracting(Despesa::getParcelaNumero).containsExactly(1, 2, 3);
        assertThat(parcelas).extracting(Despesa::getParcelasTotal).containsOnly(3);
        assertThat(parcelas).extracting(Despesa::getValor).containsOnly(new BigDecimal("100.00"));
    }

    @Test
    void deveJogarOsCentavosDaDivisaoNaPrimeiraParcela() {
        // R$ 100 em 3x nao divide redondo. As parcelas tem que somar exatamente
        // o total - senao o orcamento fica devendo (ou sobrando) um centavo.
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        simularGeracaoDeId();

        despesaService.criar(1L, compraNoCredito(new BigDecimal("100.00"), 3));

        List<Despesa> parcelas = capturarSaves(4).subList(1, 4);
        assertThat(parcelas).extracting(Despesa::getValor).containsExactly(
                new BigDecimal("33.34"), new BigDecimal("33.33"), new BigDecimal("33.33"));
        assertThat(parcelas.stream().map(Despesa::getValor).reduce(BigDecimal.ZERO, BigDecimal::add))
                .isEqualByComparingTo(new BigDecimal("100.00"));
    }

    @Test
    void deveAmarrarAsParcelasPeloIdDaPrimeira() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        simularGeracaoDeId();

        Despesa primeira = despesaService.criar(1L, compraNoCredito(new BigDecimal("300.00"), 3));

        assertThat(primeira.getParcelamentoId()).isEqualTo(primeira.getId());
        assertThat(capturarSaves(4).subList(1, 4)).extracting(Despesa::getParcelamentoId)
                .containsOnly(primeira.getId());
    }

    @Test
    void deveAvancarOMesDeReferenciaDasParcelasQuandoEleExiste() {
        // Despesa vinda do Leitor de fatura: quem manda no mes do orcamento e o
        // mesReferencia, entao a parcela 2 tem que cair no mes seguinte por ele
        // tambem, nao so pela data real da compra.
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));
        simularGeracaoDeId();

        Despesa nova = compraNoCredito(new BigDecimal("200.00"), 2);
        nova.setMesReferencia(LocalDate.of(2026, 9, 1));
        despesaService.criar(1L, nova);

        assertThat(capturarSaves(3).subList(1, 3)).extracting(Despesa::getMesReferencia)
                .containsExactly(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1));
    }

    @Test
    void deveRecusarParcelamentoNoDebito() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));

        Despesa nova = compraNoCredito(new BigDecimal("300.00"), 3);
        nova.setFormaPagamento(FormaPagamento.DEBITO);

        assertThatThrownBy(() -> despesaService.criar(1L, nova))
                .isInstanceOf(OperacaoInvalidaException.class);
        verify(despesaRepository, never()).save(any());
    }

    @Test
    void deveRecusarMaisDeDozeParcelas() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaDoUsuario(5L, 1L)));

        assertThatThrownBy(() -> despesaService.criar(1L, compraNoCredito(new BigDecimal("300.00"), 13)))
                .isInstanceOf(OperacaoInvalidaException.class);
        verify(despesaRepository, never()).save(any());
    }

    @Test
    void deveRecusarCompraParceladaEmCategoriaFixa() {
        // Categoria fixa ja repete todo mes; parcelamento tambem ocupa os meses
        // seguintes, mas com fim. Juntas, a mesma compra cairia duas vezes por
        // mes (a parcela + a ocorrencia do catch-up). Numa categoria fixa so
        // entra despesa de 1x - e a recusa e explicita, nao um ajuste calado.
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaFixaDoUsuario(5L, 1L)));

        assertThatThrownBy(() -> despesaService.criar(1L, compraNoCredito(new BigDecimal("300.00"), 3)))
                .isInstanceOf(OperacaoInvalidaException.class)
                .hasMessageContaining("fixa");

        verify(despesaRepository, never()).save(any());
        verify(recorrenciaDespesaRepository, never()).save(any());
    }

    @Test
    void deveAceitarDespesaNoCreditoEmCategoriaFixaQuandoForDeUmaParcela() {
        // O outro lado da regra: credito em categoria fixa e perfeitamente
        // valido (uma assinatura no cartao, por exemplo) - desde que 1x. E como
        // e 1x, a serie fixa nasce normalmente.
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioComId(1L)));
        when(categoriaRepository.findById(5L)).thenReturn(Optional.of(categoriaFixaDoUsuario(5L, 1L)));
        when(recorrenciaDespesaRepository.save(any(RecorrenciaDespesa.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        simularGeracaoDeId();

        Despesa salva = despesaService.criar(1L, compraNoCredito(new BigDecimal("39.90"), 1));

        assertThat(salva.getFormaPagamento()).isEqualTo(FormaPagamento.CREDITO);
        assertThat(salva.getRecorrencia()).isNotNull();
        assertThat(salva.getParcelasTotal()).isEqualTo(1);
    }

    @Test
    void deveRecusarMoverCompraParceladaParaCategoriaFixaNaEdicao() {
        // Mesma regra na edicao: sem isto, dava pra criar a combinacao proibida
        // pela porta dos fundos, so trocando a categoria depois.
        Despesa parcela = despesaComId(10L, 1L, 5L, new BigDecimal("100.00"));
        parcela.setParcelamentoId(10L);
        parcela.setParcelaNumero(1);
        parcela.setParcelasTotal(3);
        parcela.setFormaPagamento(FormaPagamento.CREDITO);

        Despesa dados = despesaComId(null, 1L, 7L, new BigDecimal("100.00"));
        dados.setFormaPagamento(FormaPagamento.CREDITO);

        when(despesaRepository.findById(10L)).thenReturn(Optional.of(parcela));
        when(categoriaRepository.findById(7L)).thenReturn(Optional.of(categoriaFixaDoUsuario(7L, 1L)));

        assertThatThrownBy(() -> despesaService.atualizar(1L, 10L, dados))
                .isInstanceOf(OperacaoInvalidaException.class);

        verify(despesaRepository, never()).save(any());
    }

    @Test
    void deveExcluirTodasAsParcelasAoExcluirUmaDelas() {
        // Uma parcela sozinha nao e uma despesa que exista no mundo real:
        // apagar a 2/3 e deixar 1/3 e 3/3 nao descreve compra nenhuma.
        Despesa parcela2 = despesaComId(20L, 1L, 5L, new BigDecimal("100.00"));
        parcela2.setParcelamentoId(10L);
        parcela2.setParcelaNumero(2);
        parcela2.setParcelasTotal(3);
        List<Despesa> grupo = List.of(
                despesaComId(10L, 1L, 5L, new BigDecimal("100.00")),
                parcela2,
                despesaComId(30L, 1L, 5L, new BigDecimal("100.00")));

        when(despesaRepository.findById(20L)).thenReturn(Optional.of(parcela2));
        when(despesaRepository.findByParcelamentoIdOrderByParcelaNumeroAsc(10L)).thenReturn(grupo);

        despesaService.excluir(1L, 20L);

        verify(despesaRepository).deleteAll(grupo);
        verify(despesaRepository, never()).delete(any(Despesa.class));
    }

    @Test
    void devePropagarDescricaoECategoriaParaAsOutrasParcelasAoEditar() {
        // Renomear "Geladeira 1/6" tem que renomear as seis: descricao,
        // categoria e forma de pagamento sao da compra, nao da parcela.
        Despesa parcela1 = despesaComId(10L, 1L, 5L, new BigDecimal("100.00"));
        parcela1.setParcelamentoId(10L);
        parcela1.setParcelaNumero(1);
        parcela1.setParcelasTotal(3);
        parcela1.setFormaPagamento(FormaPagamento.CREDITO);
        Despesa parcela2 = despesaComId(20L, 1L, 5L, new BigDecimal("100.00"));
        parcela2.setParcelamentoId(10L);
        parcela2.setParcelaNumero(2);
        parcela2.setParcelasTotal(3);
        parcela2.setFormaPagamento(FormaPagamento.CREDITO);

        Despesa dados = despesaComId(null, 1L, 7L, new BigDecimal("120.00"));
        dados.setDescricao("Geladeira Brastemp");
        dados.setFormaPagamento(FormaPagamento.CREDITO);

        when(despesaRepository.findById(10L)).thenReturn(Optional.of(parcela1));
        when(categoriaRepository.findById(7L)).thenReturn(Optional.of(categoriaDoUsuario(7L, 1L)));
        when(despesaRepository.findByParcelamentoIdOrderByParcelaNumeroAsc(10L))
                .thenReturn(List.of(parcela1, parcela2));
        when(despesaRepository.save(any(Despesa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        despesaService.atualizar(1L, 10L, dados);

        assertThat(parcela2.getDescricao()).isEqualTo("Geladeira Brastemp");
        assertThat(parcela2.getCategoria().getId()).isEqualTo(7L);
        // Valor e data ficam so na parcela editada: ajustar uma parcela e
        // ajuste pontual, nao reescreve a divisao inteira da compra.
        assertThat(parcela2.getValor()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(parcela1.getValor()).isEqualByComparingTo(new BigDecimal("120.00"));
    }

}
