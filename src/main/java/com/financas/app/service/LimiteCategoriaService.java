package com.financas.app.service;

import com.financas.app.exception.LimiteJaExisteException;
import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.Categoria;
import com.financas.app.model.LimiteCategoria;
import com.financas.app.model.Usuario;
import com.financas.app.repository.CategoriaRepository;
import com.financas.app.repository.LimiteCategoriaRepository;
import com.financas.app.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Limites de gasto por categoria, com VIGÊNCIA (ver V3__vigencia_limite_categoria.sql).
 *
 * <p>Cada linha vale no intervalo semiaberto {@code [mesInicio, mesFim)}. Todo
 * mês que chega aqui é normalizado para o primeiro dia — a unidade é o mês, o
 * dia nunca importa.
 *
 * <p>As três operações que mexem no tempo, e por quê:
 * <ul>
 *   <li><b>criar</b> abre a vigência no mês em foco. Meses anteriores continuam
 *       sem teto: um limite criado hoje não pode julgar o que já foi gasto.</li>
 *   <li><b>excluir</b> não apaga a linha — carimba {@code mesFim} com o mês em
 *       foco. Apagar reescreveria o passado, fazendo um mês que estourou o teto
 *       passar a constar como se nunca tivesse tido limite.</li>
 *   <li><b>atualizar</b> encerra a vigência atual e abre outra com o valor novo,
 *       para os meses passados manterem o teto que realmente valia neles.</li>
 * </ul>
 */
@Service
public class LimiteCategoriaService {

    private final LimiteCategoriaRepository limiteCategoriaRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final DespesaService despesaService;
    private final Clock clock;

    public LimiteCategoriaService(LimiteCategoriaRepository limiteCategoriaRepository,
                                   CategoriaRepository categoriaRepository,
                                   UsuarioRepository usuarioRepository,
                                   DespesaService despesaService,
                                   Clock clock) {
        this.limiteCategoriaRepository = limiteCategoriaRepository;
        this.categoriaRepository = categoriaRepository;
        this.usuarioRepository = usuarioRepository;
        this.despesaService = despesaService;
        this.clock = clock;
    }

    // O mês em foco na tela é quem manda; sem ele (chamada antiga da API, sem o
    // parâmetro), assume o mês corrente.
    private LocalDate mesOuAtual(LocalDate mes) {
        return mes == null ? LocalDate.now(clock).withDayOfMonth(1) : mes.withDayOfMonth(1);
    }

    /**
     * Abre uma vigência a partir do mês em foco. Recusa se a categoria já tem
     * vigência alcançando esse mês — dois tetos simultâneos para a mesma
     * categoria não têm resposta possível em "qual vale?".
     */
    public LimiteCategoria criar(Long usuarioId, LimiteCategoria limiteCategoria, LocalDate mes) {
        LocalDate mesInicio = mesOuAtual(mes);
        Long categoriaId = limiteCategoria.getCategoria().getId();
        if (limiteCategoriaRepository.existeVigenciaAlcancando(usuarioId, categoriaId, mesInicio)) {
            throw new LimiteJaExisteException();
        }
        limiteCategoria.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        limiteCategoria.setCategoria(buscarCategoriaOuFalhar(categoriaId, usuarioId));
        limiteCategoria.setMesInicio(mesInicio);
        limiteCategoria.setMesFim(null);
        return limiteCategoriaRepository.save(limiteCategoria);
    }

    /** Só os limites que valem no mês pedido — é o que a tela do mês mostra. */
    public List<LimiteCategoria> listar(Long usuarioId, LocalDate mes) {
        return limiteCategoriaRepository.findVigentesNoMes(usuarioId, mesOuAtual(mes));
    }

    /**
     * A mesma lista, já com quanto foi gasto em cada categoria no mês.
     *
     * <p>É o que a tela de Limites consome. A versão anterior pedia a lista e
     * depois o status de cada limite separadamente — com 5 limites, 6 viagens de
     * rede em duas ondas encadeadas, cada uma pagando a latência inteira e
     * disparando o catch-up de recorrências de novo. Aqui é uma requisição, uma
     * consulta agregada e um catch-up só.
     */
    @Transactional
    public List<LimiteComStatus> listarComStatus(Long usuarioId, LocalDate mes) {
        LocalDate inicio = mesOuAtual(mes);
        List<LimiteCategoria> vigentes = limiteCategoriaRepository.findVigentesNoMes(usuarioId, inicio);
        if (vigentes.isEmpty()) {
            // Sem limite nenhum não há o que somar, e a consulta agregada custaria
            // um catch-up de recorrências à toa.
            return List.of();
        }
        LocalDate fim = inicio.withDayOfMonth(inicio.lengthOfMonth());
        Map<Long, BigDecimal> gastoPorCategoria = despesaService.somarPorCategoriaNoPeriodo(usuarioId, inicio, fim);
        return vigentes.stream()
                .map(limite -> LimiteComStatus.de(limite, gastoPorCategoria.get(limite.getCategoria().getId())))
                .toList();
    }

    /**
     * Troca o valor do teto a partir do mês em foco: encerra a vigência atual
     * nesse mês e abre uma nova com o valor novo, herdando o fim da anterior
     * (normalmente nenhum). Os meses já passados seguem apontando para a
     * vigência antiga, com o valor que valia neles.
     *
     * <p>Quando o mês em foco é o próprio início da vigência (ou anterior a
     * ele), não há passado a preservar — aí é só corrigir o valor no lugar, sem
     * criar uma vigência de zero mês.
     */
    @Transactional
    public LimiteCategoria atualizar(Long usuarioId, Long limiteId, LimiteCategoria dadosAtualizados, LocalDate mes) {
        LimiteCategoria vigente = buscarOuFalhar(limiteId, usuarioId);
        LocalDate mesEmFoco = mesOuAtual(mes);

        if (!mesEmFoco.isAfter(vigente.getMesInicio())) {
            vigente.setValorLimite(dadosAtualizados.getValorLimite());
            return limiteCategoriaRepository.save(vigente);
        }

        LocalDate fimAntigo = vigente.getMesFim();
        vigente.setMesFim(mesEmFoco);
        limiteCategoriaRepository.save(vigente);

        LimiteCategoria nova = new LimiteCategoria();
        nova.setUsuario(vigente.getUsuario());
        nova.setCategoria(vigente.getCategoria());
        nova.setValorLimite(dadosAtualizados.getValorLimite());
        nova.setMesInicio(mesEmFoco);
        nova.setMesFim(fimAntigo);
        return limiteCategoriaRepository.save(nova);
    }

    /**
     * Encerra o limite a partir do mês em foco: ele deixa de valer desse mês em
     * diante, e os anteriores ficam intactos.
     *
     * <p>O DELETE de verdade só acontece quando a vigência nunca chegou a cobrir
     * mês nenhum (criar e excluir dentro do mesmo mês) — aí não há histórico a
     * preservar, e manter a linha só deixaria lixo invisível ocupando a
     * categoria.
     */
    @Transactional
    public void excluir(Long usuarioId, Long limiteId, LocalDate mes) {
        LimiteCategoria limiteCategoria = buscarOuFalhar(limiteId, usuarioId);
        LocalDate mesEmFoco = mesOuAtual(mes);

        if (!mesEmFoco.isAfter(limiteCategoria.getMesInicio())) {
            limiteCategoriaRepository.delete(limiteCategoria);
            return;
        }
        limiteCategoria.setMesFim(mesEmFoco);
        limiteCategoriaRepository.save(limiteCategoria);
    }

    // "Gasto vs. teto" de um mês: usa a vigência que cobre ESSE mês. Um mês
    // anterior à criação do limite (ou posterior à exclusão) não tem vigência
    // nenhuma e responde 404 — para o front, "categoria sem teto no mês".
    public StatusLimiteCategoria verificarLimite(Long usuarioId, Long categoriaId, LocalDate mesReferencia) {
        LocalDate mes = mesOuAtual(mesReferencia);
        LimiteCategoria limiteCategoria = limiteCategoriaRepository
                .findVigenteNoMes(usuarioId, categoriaId, mes)
                .orElseThrow(() -> new RecursoNaoEncontradoException("LimiteCategoria", categoriaId));

        LocalDate fim = mes.withDayOfMonth(mes.lengthOfMonth());
        var valorGasto = despesaService.calcularTotalPorCategoriaEPeriodo(usuarioId, categoriaId, mes, fim);

        return new StatusLimiteCategoria(limiteCategoria.getValorLimite(), valorGasto,
                valorGasto.compareTo(limiteCategoria.getValorLimite()) > 0);
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

    private LimiteCategoria buscarOuFalhar(Long limiteId, Long usuarioId) {
        LimiteCategoria limiteCategoria = limiteCategoriaRepository.findById(limiteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("LimiteCategoria", limiteId));
        if (!limiteCategoria.getUsuario().getId().equals(usuarioId)) {
            throw new RecursoNaoEncontradoException("LimiteCategoria", limiteId);
        }
        return limiteCategoria;
    }

}
