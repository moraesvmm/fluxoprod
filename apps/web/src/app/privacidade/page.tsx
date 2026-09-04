import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { CONTATO } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Política de Privacidade | Fluxo ERP",
  description: "Como o Fluxo ERP coleta, utiliza, armazena e protege os dados pessoais dos usuários, em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <LegalShell eyebrow="Legal" title="Política de Privacidade" updatedAt="04 de setembro de 2026">
      <p>
        Esta Política de Privacidade descreve como o {CONTATO.marca} coleta, utiliza, armazena e protege
        os dados pessoais tratados no uso da plataforma, em conformidade com a Lei nº 13.709/2018 (LGPD).
      </p>

      <div>
        <h2>1. Dados que coletamos</h2>
        <ul>
          <li><strong>Dados de cadastro:</strong> nome, e-mail, senha e dados da empresa (razão social, CNPJ, porte e segmento).</li>
          <li><strong>Dados operacionais:</strong> informações inseridas por você na plataforma (clientes, produtos, notas fiscais, financeiro).</li>
          <li><strong>Dados técnicos:</strong> registros de acesso, endereço IP e informações do dispositivo, para segurança e auditoria.</li>
        </ul>
      </div>

      <div>
        <h2>2. Como utilizamos os dados</h2>
        <ul>
          <li>Prover, operar e manter a plataforma e seus módulos contratados.</li>
          <li>Autenticar usuários e garantir a segurança das contas.</li>
          <li>Emitir documentos fiscais e cumprir obrigações legais e regulatórias.</li>
          <li>Prestar suporte e comunicar informações relevantes sobre o serviço.</li>
        </ul>
      </div>

      <div>
        <h2>3. Base legal</h2>
        <p>
          O tratamento é fundamentado na execução do contrato, no cumprimento de obrigação legal, no
          legítimo interesse e, quando aplicável, no consentimento do titular.
        </p>
      </div>

      <div>
        <h2>4. Armazenamento e segurança</h2>
        <p>
          Os dados são hospedados em infraestrutura localizada no Brasil, com isolamento por empresa
          (um banco de dados lógico por cliente), criptografia em trânsito e controles de acesso.
          Adotamos medidas técnicas e administrativas para proteger os dados contra acesso não autorizado.
        </p>
      </div>

      <div>
        <h2>5. Compartilhamento</h2>
        <p>
          Não vendemos dados pessoais. O compartilhamento ocorre apenas com operadores necessários à
          prestação do serviço (por exemplo, provedores de infraestrutura e emissão fiscal) e quando
          exigido por lei ou autoridade competente.
        </p>
      </div>

      <div>
        <h2>6. Seus direitos</h2>
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade
          e eliminação dos seus dados, bem como revogar consentimentos, entrando em contato pelo e-mail{" "}
          <a href={`mailto:${CONTATO.email}`}>{CONTATO.email}</a>.
        </p>
      </div>

      <div>
        <h2>7. Retenção</h2>
        <p>
          Os dados são mantidos pelo período necessário à prestação do serviço e ao cumprimento de
          obrigações legais. Após esse período, são eliminados ou anonimizados.
        </p>
      </div>

      <div>
        <h2>8. Contato do encarregado</h2>
        <p>
          Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, contate-nos pelo e-mail{" "}
          <a href={`mailto:${CONTATO.email}`}>{CONTATO.email}</a> ou pelo WhatsApp {CONTATO.whatsappExibicao}.
        </p>
      </div>
    </LegalShell>
  );
}
