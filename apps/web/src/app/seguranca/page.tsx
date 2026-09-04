import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { CONTATO } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Segurança e Conformidade | Fluxo ERP",
  description: "Práticas de segurança, isolamento de dados por empresa, criptografia e conformidade com a LGPD adotadas pelo Fluxo ERP.",
};

export default function SegurancaPage() {
  return (
    <LegalShell eyebrow="Confiança" title="Segurança e Conformidade" updatedAt="04 de setembro de 2026">
      <p>
        A segurança dos dados é um princípio central do {CONTATO.marca}. Esta página resume as práticas
        adotadas para proteger as informações da sua empresa.
      </p>

      <div>
        <h2>Isolamento por empresa</h2>
        <p>
          Cada empresa opera em um ambiente lógico isolado (um banco de dados dedicado por cliente),
          reduzindo a superfície de exposição e garantindo a separação dos dados entre organizações.
        </p>
      </div>

      <div>
        <h2>Criptografia</h2>
        <p>
          As comunicações são protegidas por criptografia em trânsito (TLS). A emissão de documentos
          fiscais utiliza assinatura digital e comunicação segura (mTLS) nativas.
        </p>
      </div>

      <div>
        <h2>Hospedagem no Brasil</h2>
        <p>
          A infraestrutura é hospedada no Brasil, favorecendo a conformidade com a LGPD e a soberania
          dos dados dos nossos clientes.
        </p>
      </div>

      <div>
        <h2>Controle de acesso</h2>
        <ul>
          <li>Autenticação por credenciais individuais e políticas de senha.</li>
          <li>Perfis e permissões por função dentro de cada empresa.</li>
          <li>Registros de acesso para auditoria e rastreabilidade.</li>
        </ul>
      </div>

      <div>
        <h2>Conformidade com a LGPD</h2>
        <p>
          Tratamos os dados pessoais conforme a Lei nº 13.709/2018. Consulte nossa{" "}
          <a href="/privacidade">Política de Privacidade</a> para detalhes sobre coleta, uso e direitos
          do titular.
        </p>
      </div>

      <div>
        <h2>Continuidade e disponibilidade</h2>
        <p>
          Adotamos rotinas de backup e monitoramento para preservar a integridade dos dados e a
          disponibilidade do serviço.
        </p>
      </div>

      <div>
        <h2>Relato de vulnerabilidades</h2>
        <p>
          Identificou um possível problema de segurança? Entre em contato de forma responsável pelo
          e-mail <a href={`mailto:${CONTATO.emailSuporte}`}>{CONTATO.emailSuporte}</a> ou pelo WhatsApp{" "}
          {CONTATO.whatsappExibicao}.
        </p>
      </div>
    </LegalShell>
  );
}
