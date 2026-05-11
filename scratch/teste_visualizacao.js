const fs = require('fs');
const path = require('path');

// Carrega variáveis do arquivo .env.local se ele existir localmente
try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {
  console.warn('Erro ao carregar .env.local:', e.message);
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error('ERRO: RESEND_API_KEY não encontrada no .env.local.');
  process.exit(1);
}

const SENDER_NAME = 'Vitor Moraes';
const SENDER_EMAIL = 'onboarding@seufluxoerp.com.br';
const IMAGE_PATH = path.join(__dirname, '../apps/web/public/logo-fluxo.png');

const prospect = {
  company: 'Della Via Pneus (Visualização de Teste)',
  email: 'vmm.geral@gmail.com',
  subject: 'Produtividade de ordens de serviço na Della Via [Visualização]',
  body: 'A segunda-feira na Della Via Pneus significa oficinas cheias e equipes de campo prontas. Mas como vocês acompanham com precisão o tempo de execução que cada mecânico leva em um serviço, ou garantem a margem das peças usadas?\n\nCriamos um módulo de Ordens de Serviço em <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> com cronômetro (timer) integrado e controle automático de CMV por peça. A equipe clica em iniciar o serviço e o sistema calcula a rentabilidade real de cada OS de forma transparente.\n\nPodemos fazer um teste rápido para otimizar o giro das oficinas de vocês?'
};

async function sendEmail() {
  let imageBase64 = '';
  try {
    imageBase64 = fs.readFileSync(IMAGE_PATH).toString('base64');
  } catch (err) {
    console.warn(`Erro ao ler imagem:`, err.message);
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Georgia, serif; font-size: 16px; color: #222222; line-height: 1.8; max-width: 600px; margin: 0 auto; padding: 40px 24px; background-color: #fcfcfc; }
        p { margin: 0 0 20px; white-space: pre-line; }
        a { color: #4f46e5; text-decoration: none; border-bottom: 1px solid #4f46e5; font-weight: 500; }
        a:hover { color: #3730a3; border-bottom-color: #3730a3; }
        .signature { margin-top: 48px; padding-top: 24px; border-top: 1px solid #eaeaea; display: flex; align-items: center; gap: 16px; }
        .sig-photo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #eaeaea; }
        .sig-info { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #4b5563; line-height: 1.6; }
        .sig-name { font-weight: 700; font-size: 15px; color: #111827; }
        .sig-product { color: #4f46e5; font-weight: 600; font-size: 13px; }
        .sig-email { color: #6b7280; font-size: 13px; }
      </style>
    </head>
    <body>
      <p>${prospect.body}</p>

      <div class="signature">
        ${imageBase64 ? `<img src="cid:profile_photo" alt="${SENDER_NAME}" class="sig-photo" />` : ''}
        <div class="sig-info">
          <div class="sig-name">${SENDER_NAME}</div>
          <div class="sig-product">Fluxo ERP</div>
          <div class="sig-email">${SENDER_EMAIL}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const payload = {
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: [prospect.email],
    subject: prospect.subject,
    html: html
  };

  if (imageBase64) {
    payload.attachments = [
      {
        filename: 'perfil.png',
        content: imageBase64,
        content_id: 'profile_photo'
      }
    ];
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Erro Resend: ${JSON.stringify(data)}`);
  }
  return data;
}

sendEmail()
  .then(data => console.log('Sucesso no envio de teste:', data))
  .catch(err => console.error('Erro no envio de teste:', err));
