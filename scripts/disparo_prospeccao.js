const fs = require('fs');

const RESEND_API_KEY = 're_Bw2VwgXQ_3PK9a3zeHtJP3FYudop3jpyg';
const SENDER_NAME = 'Vitor Moraes';
const SENDER_EMAIL = 'onboarding@seufluxoerp.com.br';
const IMAGE_PATH = '/Users/macbook/fluxoprod/apps/web/public/logo-fluxo.png';

const PROSPECTS = [
  {
    company: 'Talita Kume',
    email: 'atendimento@talitakume.com.br',
    subject: 'Preparando a Talita Kume para uma segunda-feira impecável',
    body: 'Olá pessoal da Talita Kume,\n\nEstava acompanhando o trabalho de vocês e a presença da marca no Bom Retiro. Sei que o ritmo de vocês com moda fitness exige uma agilidade enorme, especialmente na virada de semana.\n\nDomingo é dia de preparar a semana. Que tal automatizar o que mais consome tempo na Talita Kume antes mesmo de a segunda começar? \n\nNotei que muitas marcas do setor perdem horas preciosas conciliando estoque de atacado e varejo. O Fluxo ERP foi desenhado justamente para centralizar isso de forma invisível, deixando vocês livres para focar no que realmente importa: a próxima coleção.\n\nGostariam de ver como o Fluxo pode simplificar a gestão de vocês em menos de 5 minutos de setup?'
  },
  {
    company: 'Absolutti',
    email: 'atendimento@absolutti.com.br',
    subject: 'Sobre a gestão financeira da Absolutti nesta semana',
    body: 'Olá equipe da Absolutti,\n\nÉ impressionante como vocês mantêm a qualidade e o design da marca em evidência.\n\nDomingo é dia de preparar a semana. Que tal automatizar o que mais consome tempo na Absolutti antes mesmo de a segunda começar? \n\nImagino que com a complexidade da operação de vocês, ter uma visão 360° do financeiro sem precisar de planilhas infinitas seria um alívio. O Fluxo centraliza todo o seu DRE e fluxo de caixa de forma automática, para que amanhã você já chegue com os números na mão.\n\nPodemos conversar 2 minutos sobre como zerar esse trabalho manual?'
  },
  {
    company: 'Malagueta Fashion',
    email: 'sac@malaguetafashion.com.br',
    subject: 'Um detalhe sobre a emissão de notas da Malagueta',
    body: 'Olá, time da Malagueta Fashion,\n\nAdmiro muito a identidade visual e o alcance que vocês conquistaram no mercado.\n\nDomingo é dia de preparar a semana. Que tal automatizar o que mais consome tempo na Malagueta antes mesmo de a segunda começar? \n\nSei que a emissão de NFe e o controle de pedidos podem se tornar um gargalo quando o volume aumenta. No Fluxo, a emissão de NFe é nativa e integrada ao CRM, eliminando erros de digitação e retrabalho.\n\nO que acha de testar essa facilidade gratuitamente nesta semana que começa?'
  },
  {
    company: 'Della Via Pneus',
    email: 'sacecommerce@dellavia.com.br',
    subject: 'Sobre a produtividade das ordens de serviço na Della Via',
    body: 'Olá pessoal da Della Via,\n\nVocês são referência em serviços automotivos e sei que a agilidade no balcão é o que define a satisfação do cliente de vocês.\n\nDomingo é dia de preparar a semana. Que tal automatizar o que mais consome tempo na Della Via antes mesmo de a segunda começar? \n\nO controle de produtividade e o laudo técnico de cada OS costumam ser os pontos que mais tomam tempo dos gestores. O Fluxo possui um módulo de OS com timer e histórico completo para facilitar a vida da sua equipe técnica.\n\nFaz sentido conversarmos sobre como o Fluxo pode acelerar o giro das suas oficinas?'
  }
];

async function sendEmail(prospect) {
  const imageBase64 = fs.readFileSync(IMAGE_PATH).toString('base64');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Georgia, serif; font-size: 16px; color: #1a1a1a; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 32px 24px; }
        p { margin: 0 0 16px; white-space: pre-line; }
        .signature { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e0e0e0; display: flex; align-items: center; gap: 16px; }
        .sig-photo { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }
        .sig-info { font-size: 14px; color: #444; line-height: 1.5; }
        .sig-name { font-weight: bold; font-size: 15px; color: #1a1a1a; }
        .sig-product { color: #555; font-size: 13px; }
      </style>
    </head>
    <body>
      <p>${prospect.body}</p>

      <div class="signature">
        <img src="cid:profile_photo" alt="${SENDER_NAME}" class="sig-photo" />
        <div class="sig-info">
          <div class="sig-name">${SENDER_NAME}</div>
          <div class="sig-product">Fluxo ERP</div>
          <div>${SENDER_EMAIL}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [prospect.email],
      subject: prospect.subject,
      html: html,
      attachments: [
        {
          filename: 'perfil.png',
          content: imageBase64,
          content_id: 'profile_photo'
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Error for ${prospect.company}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  const logFile = '/Users/macbook/fluxoprod/log_envios.md';
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '| Data | Empresa | Contato | E-mail | Status |\n|------|---------|---------|--------|--------|\n');
  }

  console.log(`Iniciando disparos para ${PROSPECTS.length} prospects...`);
  
  for (const prospect of PROSPECTS) {
    try {
      console.log(`Enviando para ${prospect.company}...`);
      await sendEmail(prospect);
      console.log(`Sucesso: ${prospect.company}`);
      fs.appendFileSync(logFile, `| ${new Date().toISOString().split('T')[0]} | ${prospect.company} | - | ${prospect.email} | enviado |\n`);
      
      // Wait 5 seconds between sends
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`Falha ao enviar para ${prospect.company}:`, error.message);
      fs.appendFileSync(logFile, `| ${new Date().toISOString().split('T')[0]} | ${prospect.company} | - | ${prospect.email} | erro: ${error.message} |\n`);
    }
  }
  
  console.log('Disparos concluídos.');
}

run();
