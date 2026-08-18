package com.financas.app.service;

import com.financas.app.exception.RecursoNaoEncontradoException;
import com.financas.app.model.RecorrenciaRenda;
import com.financas.app.model.Renda;
import com.financas.app.model.Usuario;
import com.financas.app.model.enums.TipoRenda;
import com.financas.app.repository.RecorrenciaRendaRepository;
import com.financas.app.repository.RendaRepository;
import com.financas.app.repository.UsuarioRepository;
import com.financas.app.util.JanelaCatchUp;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class RendaService {

    // Extremos usados quando o cliente omite o filtro. Não são "sem limite":
    // o teto de TetoDeListagem continua valendo, então um histórico grande
    // demais recebe 400 pedindo um intervalo menor, em vez de carregar tudo.
    private static final LocalDate ABERTO_INICIO = LocalDate.of(1, 1, 1);
    private static final LocalDate ABERTO_FIM = LocalDate.of(9999, 12, 31);

    private final RendaRepository rendaRepository;
    private final UsuarioRepository usuarioRepository;
    private final RecorrenciaRendaRepository recorrenciaRendaRepository;

    public RendaService(RendaRepository rendaRepository, UsuarioRepository usuarioRepository,
                         RecorrenciaRendaRepository recorrenciaRendaRepository) {
        this.rendaRepository = rendaRepository;
        this.usuarioRepository = usuarioRepository;
        this.recorrenciaRendaRepository = recorrenciaRendaRepository;
    }

    @Transactional
    public Renda criar(Long usuarioId, Renda renda) {
        renda.setUsuario(buscarUsuarioOuFalhar(usuarioId));
        if (renda.getTipo() == TipoRenda.FIXA) {
            renda.setRecorrencia(criarRecorrencia(renda));
        }
        return rendaRepository.save(renda);
    }

    // Nova série independente a cada criação manual de renda FIXA (ex.: pode
    // haver mais de um "salário" fixo).
    private RecorrenciaRenda criarRecorrencia(Renda renda) {
        RecorrenciaRenda recorrencia = new RecorrenciaRenda();
        recorrencia.setUsuario(renda.getUsuario());
        recorrencia.setAtiva(true);
        recorrencia.setDataInicio(renda.getMesReferencia().withDayOfMonth(1));
        return recorrenciaRendaRepository.save(recorrencia);
    }

    // `inicio`/`fim` são o 1º dia do mês de cada extremo, ambos opcionais.
    //
    // `fim` acumula dois papéis de propósito: além de filtrar, é até onde as
    // rendas FIXAS são materializadas. Antes isso era um parâmetro `ate`
    // separado, mas as três telas que chamam este endpoint sempre passavam o
    // mesmo valor nos dois — o mês em foco no seletor. Dois parâmetros que
    // nunca divergem são um convite a divergirem por engano.
    @Transactional
    public List<Renda> listarPorUsuario(Long usuarioId, LocalDate inicio, LocalDate fim) {
        garantirRecorrencias(usuarioId, fim);
        LocalDate de = inicio != null ? inicio : ABERTO_INICIO;
        LocalDate ate = fim != null ? fim : ABERTO_FIM;
        TetoDeListagem.conferir(rendaRepository.countByUsuarioIdAndMesReferenciaBetween(usuarioId, de, ate));
        return rendaRepository.findByUsuarioIdAndMesReferenciaBetween(usuarioId, de, ate);
    }

    @Transactional
    public Renda atualizar(Long usuarioId, Long rendaId, Renda dadosAtualizados) {
        Renda renda = buscarOuFalhar(rendaId, usuarioId);
        renda.setDescricao(dadosAtualizados.getDescricao());
        renda.setValor(dadosAtualizados.getValor());
        renda.setMesReferencia(dadosAtualizados.getMesReferencia());
        renda.setTipo(dadosAtualizados.getTipo());
        sincronizarRecorrenciaComTipo(renda);
        return rendaRepository.save(renda);
    }

    // O tipo pode mudar na edição, e a série precisa acompanhar: virar FIXA sem
    // isto deixava a renda rotulada como fixa mas sem repetir nos meses
    // seguintes, e deixar de ser FIXA mantinha a série gerando ocorrências.
    private void sincronizarRecorrenciaComTipo(Renda renda) {
        boolean fixa = renda.getTipo() == TipoRenda.FIXA;
        if (fixa && renda.getRecorrencia() == null) {
            renda.setRecorrencia(criarRecorrencia(renda));
        } else if (!fixa && renda.getRecorrencia() != null) {
            RecorrenciaRenda recorrencia = renda.getRecorrencia();
            recorrencia.setAtiva(false);
            recorrenciaRendaRepository.save(recorrencia);
            renda.setRecorrencia(null);
        }
    }

    // Exclui só esta ocorrência. Se for a mais recente de uma recorrência
    // ativa, também encerra a série; ocorrências de meses passados continuam
    // intactas no banco.
    public void excluir(Long usuarioId, Long rendaId) {
        Renda renda = buscarOuFalhar(rendaId, usuarioId);
        if (renda.getRecorrencia() != null) {
            RecorrenciaRenda recorrencia = renda.getRecorrencia();
            rendaRepository.findTopByRecorrenciaIdOrderByMesReferenciaDesc(recorrencia.getId())
                    .filter(ultima -> ultima.getId().equals(renda.getId()))
                    .ifPresent(ultima -> {
                        recorrencia.setAtiva(false);
                        recorrenciaRendaRepository.save(recorrencia);
                    });
        }
        rendaRepository.delete(renda);
    }

    @Transactional
    public BigDecimal calcularTotalMes(Long usuarioId, LocalDate mesReferencia) {
        garantirRecorrencias(usuarioId, mesReferencia);
        return rendaRepository.findByUsuarioIdAndMesReferencia(usuarioId, mesReferencia).stream()
                .map(Renda::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Catch-up preguiçoso: mesma lógica de DespesaService, mas avançando
    // mesReferencia mês a mês (sempre dia 1, sem clamping de dia). `ate` é o mês
    // que a tela está consultando — a série é preenchida até ele, o que faz a
    // renda fixa aparecer também quando se navega para um mês futuro, e não só
    // até o mês corrente.
    private void garantirRecorrencias(Long usuarioId, LocalDate ate) {
        LocalDate limite = JanelaCatchUp.limiteDeGeracao(ate);
        for (RecorrenciaRenda recorrencia : recorrenciaRendaRepository.travarAtivasDoUsuario(usuarioId)) {
            Renda ultima = rendaRepository.findTopByRecorrenciaIdOrderByMesReferenciaDesc(recorrencia.getId()).orElse(null);
            if (ultima == null) {
                continue; // defensivo: não deveria acontecer (a criação sempre gera a 1ª ocorrência)
            }
            LocalDate cursor = ultima.getMesReferencia().withDayOfMonth(1).plusMonths(1);
            while (!cursor.isAfter(limite)) {
                Renda nova = new Renda();
                nova.setUsuario(ultima.getUsuario());
                nova.setDescricao(ultima.getDescricao());
                nova.setValor(ultima.getValor());
                nova.setMesReferencia(cursor);
                nova.setTipo(TipoRenda.FIXA);
                nova.setRecorrencia(recorrencia);
                ultima = salvarSeAindaNaoExiste(nova);
                cursor = cursor.plusMonths(1);
            }
        }
    }

    // Segunda linha de defesa contra duplicar a série (a primeira é o lock em
    // travarAtivasDoUsuario): cobre o caso de já existir a ocorrência do mês
    // vinda de uma execução anterior. Devolve a renda que serve de base para o
    // mês seguinte — pulando ou gravando, descricao/valor são os mesmos.
    private Renda salvarSeAindaNaoExiste(Renda nova) {
        if (rendaRepository.existsByRecorrenciaIdAndMesReferencia(
                nova.getRecorrencia().getId(), nova.getMesReferencia())) {
            return nova;
        }
        return rendaRepository.save(nova);
    }

    private Usuario buscarUsuarioOuFalhar(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário", usuarioId));
    }

    private Renda buscarOuFalhar(Long rendaId, Long usuarioId) {
        Renda renda = rendaRepository.findById(rendaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Renda", rendaId));
        if (!renda.getUsuario().getId().equals(usuarioId)) {
            throw new RecursoNaoEncontradoException("Renda", rendaId);
        }
        return renda;
    }

}
