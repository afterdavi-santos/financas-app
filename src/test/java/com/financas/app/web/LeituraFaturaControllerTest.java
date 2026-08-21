package com.financas.app.web;

import com.financas.app.dto.ItemFaturaExtraidoResponse;
import com.financas.app.dto.ItemIgnoradoResponse;
import com.financas.app.dto.ProcessarFaturaResponse;
import com.financas.app.exception.FaturaInvalidaException;
import com.financas.app.exception.GlobalExceptionHandler;
import com.financas.app.model.Usuario;
import com.financas.app.security.JwtAuthenticationFilter;
import com.financas.app.security.UsuarioAutenticado;
import com.financas.app.service.LeituraFaturaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LeituraFaturaController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
class LeituraFaturaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LeituraFaturaService leituraFaturaService;

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

    @Test
    void deveProcessarArquivoEnviado() throws Exception {
        MockMultipartFile arquivo = new MockMultipartFile("arquivo", "fatura.csv", "text/csv",
                "date,title,amount\n2026-08-01,Dl*99 Ride,\"7,56\"\n".getBytes());
        ItemFaturaExtraidoResponse item = new ItemFaturaExtraidoResponse(
                1L, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 1), "Dl*99 Ride",
                new BigDecimal("7.56"), null, null, null);
        ItemIgnoradoResponse ignorado = new ItemIgnoradoResponse(
                LocalDate.of(2026, 7, 3), "Pagamento recebido", new BigDecimal("-2095.68"), "Estorno, reembolso ou pagamento da fatura");
        when(leituraFaturaService.processar(eq(1L), any(), eq("2026-08")))
                .thenReturn(new ProcessarFaturaResponse(List.of(item), List.of(ignorado)));

        mockMvc.perform(multipart("/api/leitura-fatura/processar")
                        .file(arquivo)
                        .param("mes", "2026-08")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itens[0].descricao").value("Dl*99 Ride"))
                .andExpect(jsonPath("$.ignorados[0].descricao").value("Pagamento recebido"));
    }

    @Test
    void deveRetornar400ParaArquivoInvalido() throws Exception {
        MockMultipartFile arquivo = new MockMultipartFile("arquivo", "fatura.txt", "text/plain",
                "conteudo qualquer".getBytes());
        when(leituraFaturaService.processar(eq(1L), any(), eq("2026-08")))
                .thenThrow(new FaturaInvalidaException("Envie um arquivo .csv exportado do Nubank."));

        mockMvc.perform(multipart("/api/leitura-fatura/processar")
                        .file(arquivo)
                        .param("mes", "2026-08")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(autenticacao))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRecusarRequisicaoSemAutenticacao() throws Exception {
        MockMultipartFile arquivo = new MockMultipartFile("arquivo", "fatura.csv", "text/csv", "conteudo".getBytes());

        mockMvc.perform(multipart("/api/leitura-fatura/processar")
                        .file(arquivo)
                        .param("mes", "2026-08")
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isUnauthorized());
    }

}
