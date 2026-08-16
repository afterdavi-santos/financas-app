package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.model.RecorrenciaDespesa;
import com.financas.app.model.Usuario;
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

}
