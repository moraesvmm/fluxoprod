const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function sendWelcomeEmail(to: string, name: string, activationLink?: string) {
  console.log(`[EmailService] Iniciando envio para ${to}. Chave presente: ${!!RESEND_API_KEY}`);
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY não configurada. E-mail não enviado.");
    return;
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Fluxo</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #111111; border: 1px solid #222222; border-radius: 20px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 60px 20px; text-align: center; }
          .content { padding: 40px; text-align: center; }
          h1 { color: #ffffff; font-size: 28px; margin-bottom: 16px; letter-spacing: -0.02em; }
          p { color: #a1a1aa; line-height: 1.6; font-size: 16px; margin-bottom: 32px; }
          .button { 
            display: inline-block; 
            padding: 18px 36px; 
            background-color: #ffffff; 
            color: #000000; 
            text-decoration: none; 
            border-radius: 12px; 
            font-weight: 700; 
            font-size: 16px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }
          .features { background-color: #1a1a1a; padding: 30px; border-radius: 16px; margin: 30px 0; text-align: left; }
          .features-title { color: #ffffff; font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.1em; }
          .feature-item { color: #d1d1d6; font-size: 14px; margin-bottom: 10px; display: flex; align-items: center; }
          .footer { padding: 30px; text-align: center; color: #52525b; font-size: 12px; border-top: 1px solid #222222; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 40px; font-weight: 800;">Fluxo</h1>
          </div>
          <div class="content">
            <h1>Olá, ${name}! 🚀</h1>
            <p>Seu teste gratuito de 7 dias começou. Prepare-se para elevar sua gestão a um novo patamar de eficiência e controle.</p>
            
            <a href="${activationLink}" class="button">ATIVAR MINHA CONTA AGORA</a>

            <div class="features">
              <div class="features-title">O que você vai acessar:</div>
              <div class="feature-item">✓ Dashboard de Inteligência Comercial</div>
              <div class="feature-item">✓ Controle de Estoque & Financeiro</div>
              <div class="feature-item">✓ CRM com Nurturing Automático</div>
            </div>

            <p style="font-size: 13px; color: #71717a;">
              Se o botão não funcionar, use o link: <br/>
              <span style="color: #6366f1; word-break: break-all;">${activationLink}</span>
            </p>
          </div>
          <div class="footer">
            Fluxo ERP &copy; 2026 • Inteligência em Gestão de Alta Performance
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Fluxo <onboarding@seufluxoerp.com.br>",
        to: [to],
        subject: "Bem-vindo ao Fluxo! Ative sua conta 🚀",
        html: html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[EmailService] Erro ao enviar e-mail via Resend:", data);
      throw new Error(`Erro Resend: ${response.statusText}`);
    }
    return data;
  } catch (error) {
    console.error("[EmailService] Erro ao enviar e-mail:", error);
    throw error;
  }
}
