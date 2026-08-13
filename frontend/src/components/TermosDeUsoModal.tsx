import { Modal } from "./Modal";

interface Props {
  aberto: boolean;
  onClose: () => void;
}

// Texto lido no cadastro (RegisterPage) via link "Termos de Uso e Política
// de Privacidade" — reaproveita o Modal genérico, então já sai com rolagem
// própria (max-h-[90vh]) e a borda azul-marinho padrão dos popups do app.
export function TermosDeUsoModal({ aberto, onClose }: Props) {
  return (
    <Modal
      titulo="Termos de Uso e Política de Privacidade"
      aberto={aberto}
      onClose={onClose}
      largura="max-w-2xl"
    >
      <div className="space-y-4 font-body text-sm text-grouper-navy">
        <p className="text-xs text-grouper-navy/60">
          Última atualização: 2026-08-11
        </p>

        <section className="space-y-1">
          <h3 className="font-display font-semibold text-grouper-ink">
            1. Sobre este sistema
          </h3>
          <p>
            Este é um sistema de gestão de finanças pessoais, desenvolvido de forma
            independente para uso próprio e de pessoas próximas convidadas pelo
            autor. Não é uma instituição financeira, não presta consultoria de
            investimentos e não tem qualquer vínculo com bancos ou corretoras — os
            dados de CDI usados no cálculo do Investimento CDB vêm de uma consulta
            pública ao Banco Central, sem envio de nenhuma informação sua.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="font-display font-semibold text-grouper-ink">
            2. Quais dados são coletados
          </h3>
          <p>Ao usar o sistema, você fornece:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>Dados de cadastro: nome, e-mail e senha.</li>
            <li>Opcionalmente, uma foto de perfil.</li>
            <li>
              Dados financeiros que você registra: despesas, rendas, categorias,
              limites de gastos, objetivos e investimentos (CDB), incluindo os
              valores, datas e descrições que você digitar.
            </li>
            <li>
              Se você usar o Leitor de fatura, os dados do arquivo CSV enviado
              (data, descrição e valor de cada lançamento) — o arquivo em si não é
              guardado, só as despesas que você confirmar importar.
            </li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="font-display font-semibold text-grouper-ink">
            3. Para que esses dados são usados
          </h3>
          <p>
            Única e exclusivamente para o funcionamento do próprio sistema: mostrar
            de volta pra você seus lançamentos, calcular seus resumos, gráficos e
            progresso das suas metas. Seus dados não são usados para nenhuma outra
            finalidade.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="font-display font-semibold text-grouper-ink">
            4. Armazenamento e segurança
          </h3>
          <p>
            Seus dados ficam num banco de dados próprio do sistema, isolados por
            usuário — cada pessoa só acessa os próprios registros. Sua senha nunca é
            guardada em texto puro: passa por um algoritmo de hash (bcrypt) antes de
            ser salva, e nem o responsável pelo sistema consegue vê-la. O acesso à
            sua conta é protegido por sessão (token), que expira automaticamente por
            inatividade.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="font-display font-semibold text-grouper-ink">
            5. Compartilhamento com terceiros
          </h3>
          <p>
            Seus dados <strong>não são vendidos, compartilhados ou usados para
            publicidade</strong>. A única comunicação externa que o sistema faz é
            uma consulta pública à API do Banco Central para obter a taxa do CDI
            (usada no cálculo de investimentos) — essa consulta não envia nenhum
            dado seu, pessoal ou financeiro.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="font-display font-semibold text-grouper-ink">
            6. Seus direitos
          </h3>
          <p>
            Você pode, a qualquer momento, acessar, corrigir ou excluir seus dados
            diretamente pelo próprio sistema. Para solicitar a exclusão completa da
            sua conta (ou tirar qualquer dúvida sobre seus dados), entre em contato
            com o responsável pelo sistema.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="font-display font-semibold text-grouper-ink">
            7. Responsabilidade sobre as informações financeiras
          </h3>
          <p>
            O sistema é uma ferramenta de apoio à organização financeira pessoal.
            Os cálculos (economia, plano de contenção, rendimento de investimentos
            etc.) são estimativas baseadas nos dados que você mesmo informa, e
            decisões financeiras tomadas com base neles são de sua inteira
            responsabilidade. O sistema não substitui orientação de um profissional
            qualificado.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="font-display font-semibold text-grouper-ink">
            8. Alterações nestes termos
          </h3>
          <p>
            Este texto pode ser atualizado conforme o sistema evolui. Mudanças
            relevantes serão comunicadas dentro do próprio sistema.
          </p>
        </section>
      </div>
    </Modal>
  );
}
