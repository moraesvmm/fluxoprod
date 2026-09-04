import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { CONTATO } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Termos de Uso | Fluxo ERP",
  description: "Termos e condições que regem o uso da plataforma Fluxo ERP, incluindo assinatura, cancelamento e responsabilidades.",
};

export default function TermosPage() {
  return (
    <LegalShell eyebrow="Legal" title="Termos de Uso" updatedAt="04 de setembro de 2026">
      <p>
        Estes Termos de Uso regem o acesso e a utilização da plataforma {CONTATO.marca}. Ao criar uma
        conta ou utilizar o serviço, você declara ter lido e concordado com estas condições.
      </p>

      <div>
        <h2>1. Objeto</h2>
        <p>
          O {CONTATO.marca} é uma plataforma de gestão empresarial em nuvem (SaaS) disponibilizada por
          assinatura, com módulos que podem ser contratados conforme a necessidade da empresa.
        </p>
      </div>

      <div>
        <h2>2. Cadastro e conta</h2>
        <ul>
          <li>Você é responsável pela veracidade das informações fornecidas no cadastro.</li>
          <li>As credenciais de acesso são pessoais e intransferíveis.</li>
          <li>É sua responsabilidade manter a confidencialidade da senha e das ações realizadas na conta.</li>
        </ul>
      </div>

      <div>
        <h2>3. Período de teste</h2>
        <p>
          Oferecemos um período de teste gratuito de 7 dias, sem necessidade de cartão de crédito. Ao
          final do período, a continuidade do serviço depende da contratação de um plano.
        </p>
      </div>

      <div>
        <h2>4. Assinatura e pagamento</h2>
        <ul>
          <li>A assinatura é mensal e os valores são apresentados em reais (BRL).</li>
          <li>Os módulos adicionais são cobrados conforme a seleção realizada na contratação.</li>
          <li>A emissão de documentos fiscais correspondentes ocorre conforme a legislação vigente.</li>
        </ul>
      </div>

      <div>
        <h2>5. Cancelamento</h2>
        <p>
          A assinatura não possui fidelidade. Você pode cancelar a qualquer momento, sem multa. O acesso
          permanece ativo até o fim do ciclo já pago, sem renovação posterior.
        </p>
      </div>

      <div>
        <h2>6. Uso aceitável</h2>
        <p>
          É vedado utilizar a plataforma para fins ilícitos, violar direitos de terceiros, tentar acessar
          áreas restritas ou comprometer a segurança e a disponibilidade do serviço.
        </p>
      </div>

      <div>
        <h2>7. Disponibilidade e suporte</h2>
        <p>
          Empregamos esforços para manter alta disponibilidade do serviço. O suporte é prestado por
          WhatsApp e e-mail durante o período de teste e de assinatura.
        </p>
      </div>

      <div>
        <h2>8. Limitação de responsabilidade</h2>
        <p>
          O serviço é fornecido "no estado em que se encontra". Não nos responsabilizamos por danos
          indiretos decorrentes de uso indevido, indisponibilidade de terceiros ou dados inseridos
          incorretamente pelo usuário.
        </p>
      </div>

      <div>
        <h2>9. Alterações</h2>
        <p>
          Estes Termos podem ser atualizados. Alterações relevantes serão comunicadas pelos canais
          oficiais. O uso continuado após a atualização implica concordância com a nova versão.
        </p>
      </div>

      <div>
        <h2>10. Contato</h2>
        <p>
          Em caso de dúvidas, contate-nos pelo e-mail{" "}
          <a href={`mailto:${CONTATO.email}`}>{CONTATO.email}</a> ou pelo WhatsApp {CONTATO.whatsappExibicao}.
        </p>
      </div>
    </LegalShell>
  );
}
