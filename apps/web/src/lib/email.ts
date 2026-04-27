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
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="https://seufluxoerp.com.br/logo-fluxo.png" alt="Fluxoprod Logo" style="width: 180px; height: auto;" />
            </div>
            <h1 style="color: #4f46e5; text-align: center;">Olá, ${name}!</h1>
            <p style="font-size: 16px; line-height: 1.6;">
              É um prazer ter você conosco no <strong>Fluxoprod</strong>. Sua conta foi criada com sucesso e seu ambiente já está sendo preparado.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              Para começar a explorar a plataforma, certifique-se de validar seu e-mail através do link enviado anteriormente.
            </p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h2 style="font-size: 18px; margin-top: 0;">Próximos passos:</h2>
              <ul style="padding-left: 20px;">
                <li>Confirme seu e-mail</li>
                <li>Acesse seu painel administrativo</li>
                <li>Configure seus primeiros produtos e serviços</li>
              </ul>
            </div>
            <p style="font-size: 14px; color: #666;">
              Se tiver qualquer dúvida, responda a este e-mail ou entre em contato com nosso suporte.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              Fluxoprod ERP - Transformando sua gestão
            </p>
          </div>
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
