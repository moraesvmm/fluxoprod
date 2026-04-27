const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function sendWelcomeEmail(to: string, name: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY não configurada.");
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Fluxoprod <onboarding@seufluxoerp.com.br>",
        to: [to],
        subject: "Bem-vindo ao Fluxoprod! 🚀",
        html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
    
    <!-- Header com Logo -->
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
      <img src="https://seufluxoerp.com.br/logo-fluxo.png" alt="Fluxoprod" style="width: 160px; height: auto; filter: brightness(0) invert(1);" />
    </div>

    <!-- Conteúdo Principal -->
    <div style="padding: 40px 30px;">
      <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin-bottom: 16px; text-align: center;">
        Seja bem-vindo ao Fluxoprod, ${name}! 🚀
      </h1>
      
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
        É um privilégio ter você conosco. O <strong>Fluxoprod</strong> foi projetado para ser o cérebro da sua operação, unindo agilidade técnica com visão estratégica em uma única plataforma.
      </p>

      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
        <h2 style="color: #374151; font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 15px;">
          O que você terá em mãos:
        </h2>
        <ul style="color: #4b5563; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li><strong>Gestão Centralizada:</strong> Do estoque ao financeiro em poucos cliques.</li>
          <li><strong>Inteligência CRM:</strong> Nurturing proativo para nunca perder uma venda.</li>
          <li><strong>Visão em Tempo Real:</strong> Dashboards precisos para decisões rápidas.</li>
          <li><strong>Escalabilidade:</strong> Módulos que crescem conforme seu negócio evolui.</li>
        </ul>
      </div>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
        Seu ambiente já está sendo preparado. Para garantir a segurança dos seus dados, não esqueça de confirmar sua conta através do link de ativação enviado anteriormente.
      </p>

      <div style="text-align: center;">
        <a href="https://seufluxoerp.com.br/login" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">
          Acessar meu Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0;">
        Fluxoprod ERP &copy; 2026 - Inteligência em Gestão<br/>
        <a href="https://seufluxoerp.com.br" style="color: #6366f1; text-decoration: none;">seufluxoerp.com.br</a>
      </p>
    </div>
  </div>
</body>
</html>
        `,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Erro ao enviar e-mail via Resend:", data);
    } else {
      console.log("E-mail de boas-vindas enviado com sucesso:", data.id);
    }
    return data;
  } catch (error) {
    console.error("Erro catastrófico ao enviar e-mail:", error);
  }
}
