const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

const admin = createClient(supabaseUrl, supabaseServiceRole);

async function run() {
  const email = 'annabeatrizmartinsdemoraes5@gmail.com';
  
  console.log('Gerando link de signup com a URL correta...');
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: email,
    options: {
      redirectTo: 'https://seufluxoerp.com.br/login?confirmed=true'
    }
  });
  
  if (linkErr) {
    console.error('Erro ao gerar link:', linkErr);
    return;
  }
  
  const activationLink = linkData?.properties?.action_link;
  console.log('Link gerado:', activationLink);
  
  const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Errata - Ativação Fluxo ERP</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #222222; border-radius: 20px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 60px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 40px; font-weight: 800; color: #ffffff;">Fluxo</h1>
          </div>
          <div style="padding: 40px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; margin-bottom: 16px; letter-spacing: -0.02em;">Olá, Anna Beatriz! 🚀</h1>
            <p style="color: #a1a1aa; line-height: 1.6; font-size: 16px; margin-bottom: 15px;">Pedimos desculpas! O link que enviamos anteriormente apresentou uma pequena falha técnica no redirecionamento.</p>
            <p style="color: #a1a1aa; line-height: 1.6; font-size: 16px; margin-bottom: 32px;">O problema já foi resolvido pela nossa equipe de engenharia. Para ativar sua conta e iniciar seu teste gratuito de 7 dias com acesso total ao ERP, basta clicar no botão abaixo:</p>
            
            <a href="${activationLink}" style="display: inline-block; padding: 18px 36px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">ATIVAR MINHA CONTA AGORA</a>

            <div style="background-color: #1a1a1a; padding: 30px; border-radius: 16px; margin: 30px 0; text-align: left;">
              <div style="color: #ffffff; font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.1em;">Seu ambiente está pronto com:</div>
              <div style="color: #d1d1d6; font-size: 14px; margin-bottom: 10px; display: flex; align-items: center;">✓ Dashboard de Inteligência Comercial</div>
              <div style="color: #d1d1d6; font-size: 14px; margin-bottom: 10px; display: flex; align-items: center;">✓ Controle de Estoque & Financeiro</div>
              <div style="color: #d1d1d6; font-size: 14px; margin-bottom: 10px; display: flex; align-items: center;">✓ CRM Automático</div>
            </div>
            
            <p style="font-size: 13px; color: #71717a;">
              Obrigado pela compreensão!<br/>Equipe Fluxo ERP
            </p>
          </div>
          <div style="padding: 30px; text-align: center; color: #52525b; font-size: 12px; border-top: 1px solid #222222;">
            Fluxo ERP &copy; 2026 • Inteligência em Gestão de Alta Performance
          </div>
        </div>
      </body>
      </html>
    `;

  console.log('Enviando via Resend...');
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Fluxo ERP <noreply@seufluxoerp.com.br>",
      to: [email],
      subject: "Errata: Seu link de ativação do Fluxo ERP",
      html: html,
    }),
  });

  const resData = await response.json();
  if (response.ok) {
    console.log('Email enviado com sucesso!', resData);
  } else {
    console.error('Falha no Resend:', resData);
  }
}

run();
