package com.financas.app.web;

import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.Despesa;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoCategoria;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.DespesaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DespesaController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class DespesaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DespesaService despesaService;

    private UsernamePasswordAuthenticationToken autenticacao;

    @BeforeEach
    void setUp() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setEmail("davi@exemplo.com");
        UsuarioAutenticado usuarioAutenticado = new UsuarioAutenticado(usuario);
        autenticacao = new UsernamePasswordAuthenticationToken(
                usuarioAutenticado, null, usuarioAutenticado.getAuthorities());
    }

    private static Despesa despesa(Long id) {
        Categoria categoria = new Categoria();
        categoria.setId(5L);
        categoria.setNome("Alimentação");
        categoria.setTipo(TipoCategoria.VARIAVEL);

        Despesa despesa = new Despesa();
        despesa.setId(id);
        despesa.setDescricao("Mercado");
        despesa.setValor(new BigDecimal("150.00"));
        despesa.setData(LocalDate.of(2026, 7, 10));
        despesa.setCategoria(categoria);
        return despesa;
    }

    @Test
    void deveCriarDespesa() throws Exception {
        when(despesaService.criar(eq(1L), any(Despesa.class))).thenReturn(despesa(20L));

        mockMvc.perform(post("/api/despesas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Mercado","valor":150.00,"data":"2026-07-10","categoriaId":5}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(20))
                .andExpect(jsonPath("$.categoria.id").value(5))
                .andExpect(jsonPath("$.recorrente").value(false))
                .andExpect(jsonPath("$.mesReferencia").doesNotExist());
    }

    @Test
    void deveCriarDespesaEcoandoMesReferenciaQuandoEnviado() throws Exception {
        Despesa comMesReferencia = despesa(21L);
        comMesReferencia.setMesReferencia(LocalDate.of(2026, 8, 1));
        when(despesaService.criar(eq(1L), any(Despesa.class))).thenReturn(comMesReferencia);

        mockMvc.perform(post("/api/despesas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Mercado","valor":150.00,"data":"2026-07-10","categoriaId":5,"mesReferencia":"2026-08-01"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mesReferencia").value("2026-08-01"));
    }

    @Test
    void deveListarDespesasComFiltros() throws Exception {
        when(despesaService.listar(1L, 5L, TipoCategoria.VARIAVEL,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .thenReturn(List.of(despesa(20L)));

        mockMvc.perform(get("/api/despesas")
                        .param("categoriaId", "5")
                        .param("tipo", "VARIAVEL")
                        .param("inicio", "2026-07-01")
                        .param("fim", "2026-07-31")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(20));
    }

    @Test
    void deveCalcularTotalPorPeriodo() throws Exception {
        when(despesaService.calcularTotalPorPeriodo(1L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .thenReturn(new BigDecimal("300.00"));

        mockMvc.perform(get("/api/despesas/total")
                        .param("inicio", "2026-07-01")
                        .param("fim", "2026-07-31")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(300.00));
    }

    @Test
    void deveAtualizarDespesa() throws Exception {
        when(despesaService.atualizar(eq(1L), eq(20L), any(Despesa.class))).thenReturn(despesa(20L));

        mockMvc.perform(put("/api/despesas/20")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Mercado","valor":150.00,"data":"2026-07-10","categoriaId":5}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(20));
    }

    @Test
    void deveRetornar404AoExcluirDespesaDeOutroUsuario() throws Exception {
        org.mockito.Mockito.doThrow(new RecursoNaoEncontradoException("Despesa", 99L))
                .when(despesaService).excluir(1L, 99L);

        mockMvc.perform(delete("/api/despesas/99")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveRecusarCriacaoComValorNegativo() throws Exception {
        mockMvc.perform(post("/api/despesas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Mercado","valor":-10,"data":"2026-07-10","categoriaId":5}
                                """))
                .andExpect(status().isBadRequest());
    }

    // A coluna é numeric(38,2): este valor de 26 dígitos entra no banco sem
    // erro nenhum e passa a somar no total do mês. @Positive não barra — só
    // olha o sinal. Quem barra é o @Digits.
    @Test
    void deveRecusarValorAcimaDoTetoDeDigitos() throws Exception {
        mockMvc.perform(post("/api/despesas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Mercado","valor":99999999999999999999999999,"data":"2026-07-10","categoriaId":5}
                                """))
                .andExpect(status().isBadRequest());

        verify(despesaService, never()).criar(any(), any());
    }

    // Sem o @Size, um texto maior que a coluna varchar(255) só falha no INSERT,
    // e o erro do banco sobe como 500.
    @Test
    void deveRecusarDescricaoAcimaDe255Caracteres() throws Exception {
        String descricaoLonga = "x".repeat(256);

        mockMvc.perform(post("/api/despesas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"descricao\":\"" + descricaoLonga
                                + "\",\"valor\":150.00,\"data\":\"2026-07-10\",\"categoriaId\":5}"))
                .andExpect(status().isBadRequest());

        verify(despesaService, never()).criar(any(), any());
    }

    // Exatamente 255 é o limite, não um a menos: o teste do limite superior
    // impede que alguém "arredonde" o @Size para baixo sem perceber.
    @Test
    void deveAceitarDescricaoComExatamente255Caracteres() throws Exception {
        when(despesaService.criar(eq(1L), any(Despesa.class))).thenReturn(despesa(20L));

        mockMvc.perform(post("/api/despesas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"descricao\":\"" + "x".repeat(255)
                                + "\",\"valor\":150.00,\"data\":\"2026-07-10\",\"categoriaId\":5}"))
                .andExpect(status().isCreated());
    }

    // Rede de segurança: se uma constraint do banco disparar mesmo assim, a
    // resposta tem que ser 400 (o dado que chegou é que está errado) e a
    // mensagem não pode repetir o texto do Postgres — ele carrega nome de
    // tabela, de coluna e de constraint, que é desenho interno do banco.
    @Test
    void deveTraduzirViolacaoDeIntegridadeEm400SemVazarDetalheDoBanco() throws Exception {
        when(despesaService.criar(eq(1L), any(Despesa.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "ERROR: value too long for type character varying(255); "
                                + "constraint \"uk_despesa_descricao\" on table \"despesa\""));

        mockMvc.perform(post("/api/despesas")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Mercado","valor":150.00,"data":"2026-07-10","categoriaId":5}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Não foi possível salvar: verifique os dados enviados."));
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/despesas"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deveCriarDespesasEmLote() throws Exception {
        when(despesaService.criarEmLote(eq(1L), any())).thenReturn(List.of(despesa(20L), despesa(21L)));

        mockMvc.perform(post("/api/despesas/lote")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"despesas":[
                                  {"descricao":"Uber","valor":20.00,"data":"2026-07-10","categoriaId":5},
                                  {"descricao":"Mercado","valor":30.00,"data":"2026-07-11","categoriaId":5}
                                ]}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void deveRecusarLoteVazio() throws Exception {
        mockMvc.perform(post("/api/despesas/lote")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"despesas":[]}
                                """))
                .andExpect(status().isBadRequest());
    }

    // MED-007: sem o @Size do DespesaLoteRequest, uma unica requisicao grava um
    // numero arbitrario de despesas — que e como alguem inflaria a propria base
    // ate tornar toda listagem cara. O `never()` e o que importa aqui: o lote
    // tem que ser recusado na validacao, antes de o service abrir transacao.
    @Test
    void deveRecusarLoteAcimaDoTeto() throws Exception {
        String item = "{\"descricao\":\"Uber\",\"valor\":20.00,\"data\":\"2026-07-10\",\"categoriaId\":5}";
        String corpo = "{\"despesas\":[" + String.join(",", java.util.Collections.nCopies(501, item)) + "]}";

        mockMvc.perform(post("/api/despesas/lote")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isBadRequest());

        verify(despesaService, never()).criarEmLote(any(), any());
    }

    @Test
    void deveAceitarLoteNoTeto() throws Exception {
        String item = "{\"descricao\":\"Uber\",\"valor\":20.00,\"data\":\"2026-07-10\",\"categoriaId\":5}";
        String corpo = "{\"despesas\":[" + String.join(",", java.util.Collections.nCopies(500, item)) + "]}";
        when(despesaService.criarEmLote(eq(1L), any())).thenReturn(List.of(despesa(20L)));

        mockMvc.perform(post("/api/despesas/lote")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isCreated());
    }

    // O 400 do teto de listagem tem que chegar ao cliente com a mensagem que
    // diz o que fazer (reduzir o intervalo). Sem o handler do
    // GlobalExceptionHandler isso vira 500, que culpa o servidor por um pedido
    // grande demais.
    @Test
    void deveResponder400QuandoAListagemEstouraOTeto() throws Exception {
        when(despesaService.listar(eq(1L), any(), any(), any(), any()))
                .thenThrow(new com.financas.app.exception.ResultadoExcessivoException(
                        "O período pedido tem 5000 lançamentos, acima do máximo de 2000 por consulta. "
                                + "Escolha um intervalo menor."));

        mockMvc.perform(get("/api/despesas")
                        .param("inicio", "0001-01-01")
                        .param("fim", "9999-12-31")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value(
                        org.hamcrest.Matchers.containsString("intervalo menor")));
    }

}
