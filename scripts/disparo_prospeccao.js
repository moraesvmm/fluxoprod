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
  console.error('ERRO: RESEND_API_KEY não foi encontrada nas variáveis de ambiente ou no .env.local.');
  process.exit(1);
}

const SENDER_NAME = 'Vitor Moraes';
const SENDER_EMAIL = 'onboarding@seufluxoerp.com.br';
const IMAGE_PATH = path.join(__dirname, '../apps/web/public/logo-fluxo.png');


const PROSPECTS = [
  {
    company: 'Talita Kume',
    email: 'atendimento@talitakume.com.br',
    subject: 'Estoque de atacado e varejo na Talita Kume',
    body: 'Como está o ritmo de fechamento de vendas da Talita Kume nesta segunda-feira? Sei que no mercado de moda rápida, conciliar as vendas do atacado físico (no Bom Retiro) com os canais online costuma gerar gargalos operacionais no estoque.\n\nDesenvolvemos uma solução em <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> que unifica o controle de estoque em tempo real de múltiplos pontos de venda com emissão de nota fiscal em lote. Vocês evitam furos de estoque e ganham agilidade no despacho.\n\nFaz sentido conversarmos por 5 minutos nesta semana sobre como automatizar essa conciliação?'
  },
  {
    company: 'Absolutti',
    email: 'atendimento@absolutti.com.br',
    subject: 'Sobre a gestão fiscal da Absolutti hoje',
    body: 'Escrever uma nova coleção e coordenar a produção na Absolutti exige foco total. Mas sei que, após o final de semana, o time financeiro de vocês costuma passar a segunda-feira conciliando faturas e emitindo notas fiscais de forma manual.\n\nEm <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a>, criamos um faturamento integrado onde as vendas dão baixa automática no estoque de tecidos e geram o contas a receber e a NF-e em poucos cliques, sem burocracia ou APIs pagas.\n\nQue tal tirarmos essa carga operacional da sua equipe técnica a partir desta semana?'
  },
  {
    company: 'Malagueta Fashion',
    email: 'sac@malaguetafashion.com.br',
    subject: 'Faturamento e expedição na Malagueta Fashion',
    body: 'Admiro muito a presença vibrante e as estampas marcantes da Malagueta. Mas com o volume de pedidos que vocês processam, o controle manual de comissões de vendedores e o fechamento do caixa de segunda-feira podem se tornar um gargalo.\n\nO sistema de PDV do <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> calcula comissões automaticamente a cada venda, unifica o fluxo de caixa físico e digital e integra tudo ao seu painel financeiro em tempo real.\n\nPodemos ver em 5 minutos como eliminar planilhas de comissão na Malagueta hoje?'
  },
  {
    company: 'Della Via Pneus',
    email: 'sacecommerce@dellavia.com.br',
    subject: 'Produtividade de ordens de serviço na Della Via',
    body: 'A segunda-feira na Della Via Pneus significa oficinas cheias e equipes de campo prontas. Mas como vocês acompanham com precisão o tempo de execução que cada mecânico leva em um serviço, ou garantem a margem das peças usadas?\n\nCriamos um módulo de Ordens de Serviço em <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> com cronômetro (timer) integrado e controle automático de CMV por peça. A equipe clica em iniciar o serviço e o sistema calcula a rentabilidade real de cada OS de forma transparente.\n\nPodemos fazer um teste rápido para otimizar o giro das oficinas de vocês?'
  },
  {
    company: 'Simplifique Engenharia',
    email: 'contato@simplifiqueengenharia.com.br',
    subject: 'Controle de custos por obra na Simplifique',
    body: 'Iniciar a semana alinhando múltiplos canteiros de obras e compras de materiais na Simplifique é um desafio diário. Pequenos desvios no orçamento de insumos podem consumir toda a margem de lucro do projeto.\n\nO módulo de Obras em <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> foi desenhado para vincular compras de estoque e pagamentos diretamente à etapa física correspondente da obra. Você tem o DRE real de cada projeto em tempo real, sem planilhas.\n\nFaz sentido agendarmos uma demonstração rápida de 5 minutos hoje?'
  },
  {
    company: 'Kes Two',
    email: 'atendimento@kestwo.com.br',
    subject: 'Kes Two: emissão de notas fiscais simplificada',
    body: 'A segunda-feira na Kes Two costuma ser focada em faturar e despachar os pedidos. Se a emissão de notas fiscais ainda exige digitar dados manualmente em sistemas lentos, a logística de vocês acaba travando.\n\nNo <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a>, a emissão de NF-e para empresas do Simples Nacional é nativa, integrada ao estoque e com custo zero por nota. Tudo flui em poucos segundos, liberando o time para vender mais.\n\nQue tal testarmos essa facilidade em 5 minutos hoje?'
  },
  {
    company: 'Bauarte',
    email: 'atendimento@bauarte.com.br',
    subject: 'Conciliação bancária rápida na Bauarte hoje',
    body: 'Quantas horas a equipe financeira da Bauarte vai passar nesta segunda-feira conciliando manualmente os pagamentos de cartão e boleto do final de semana com o extrato bancário?\n\nEm <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a>, basta fazer o upload do arquivo OFX do banco e o sistema concilia de forma automática seus lançamentos de vendas, eliminando horas de digitação e eventuais erros de caixa.\n\nPodemos liberar o tempo do seu financeiro a partir de hoje?'
  },
  {
    company: 'Spot Shoes',
    email: 'sac@spotshoes.com.br',
    subject: 'Giro de estoque e caixa na Spot Shoes',
    body: 'Como está o controle de estoque de grades de calçados na Spot Shoes para esta semana que começa? Controlar tamanhos e cores sem furos de estoque é o que define o lucro do varejo.\n\nO estoque inteligente do <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> dispara alertas de reposição para produtos abaixo do nível mínimo e faz a baixa integrada ao PDV. Você sabe exatamente o que reordenar com segurança.\n\nPodemos conversar sobre como zerar furos de grade em suas lojas?'
  },
  {
    company: 'Emporio das Sapatilhas',
    email: 'sac@emporiodassapatilhas.com.br',
    subject: 'DRE e lucratividade real no Empório das Sapatilhas',
    body: 'Controlar o fluxo de caixa de uma rede no Empório das Sapatilhas exige precisão. Sem um DRE gerencial atualizado, fica muito difícil tomar decisões seguras de compras e expansão nesta segunda-feira.\n\nNo <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a>, automatizamos o Demonstrativo de Resultados consolidando despesas, custos de mercadoria vendida (CMV) e receitas operacionais em tempo real.\n\nFaz sentido darmos uma olhada rápida em como automatizar seus relatórios financeiros?'
  },
  {
    company: 'LJM Construções',
    email: 'contato@ljmconstrucoes.com.br',
    subject: 'Relatórios de progresso de obras na LJM',
    body: 'Como a LJM Construções demonstra o avanço físico-financeiro das obras para os clientes nesta segunda-feira? Apresentar relatórios claros e profissionais evita desgastes operacionais e garante aditivos.\n\nO <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> gera relatórios analíticos de obras com cronogramas e custos reais vs previstos com um único clique. É facilidade de gestão para você e transparência total para o cliente.\n\nPodemos conversar sobre como gerar seu primeiro relatório de obras hoje?'
  },
  {
    company: 'Mattos Engenharia',
    email: 'contato@mattosengenharialoc.com.br',
    subject: 'Gestão de faturamento de contratos na Mattos',
    body: 'Iniciar a semana faturando locações e serviços de engenharia na Mattos exige controle rígido de contratos ativos. Quando o processo é disperso, cobranças e reajustes acabam sendo esquecidos.\n\nNo <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a>, unificamos o faturamento de serviços, controle de contratos e histórico de clientes em um único lugar, disparando cobranças de forma automatizada.\n\nQue tal darmos um salto na gestão dos seus contratos nesta semana?'
  },
  {
    company: 'Copa Engenharia',
    email: 'contato@copaengenharia.com.br',
    subject: 'Controle de compras e cotações na Copa Engenharia',
    body: 'Como está o planejamento de cotações e ordens de compra de insumos na Copa Engenharia para esta segunda-feira? Sem uma centralização de estoque de obras, materiais acabam sendo comprados em duplicidade.\n\nEm <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a>, o fluxo de compras de insumos é integrado diretamente ao orçamento de cada obra, alertando o gestor sobre limites de gastos e evitando prejuízos.\n\nGostaria de ver como blindar o orçamento de compras das suas obras?'
  },
  {
    company: 'Aura Construções',
    email: 'sac@auraconstrucoes.com.br',
    subject: 'Margem de lucro real por obra na Aura',
    body: 'O grande desafio da Aura Construções é garantir que o orçamento planejado bata com a execução real ao final do projeto. Sem dados precisos nesta segunda-feira, a rentabilidade é uma surpresa.\n\nO sistema de obras de <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> vincula notas fiscais de compras e pagamentos diretamente aos seus projetos, dando visibilidade total de custos e da margem real de cada obra.\n\nPodemos conversar por 5 minutos sobre como melhorar a margem de seus projetos?'
  },
  {
    company: 'Todeschini',
    email: 'sac@todeschini.com.br',
    subject: 'Controle de entrega e montagem na Todeschini',
    body: 'Garantir que a entrega e montagem dos móveis planejados da Todeschini sigam o cronograma ideal é o que define o alto padrão de satisfação do seu cliente nesta segunda-feira.\n\nO módulo de Projetos e Obras em <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> permite controlar equipes de montagem, etapas de entrega de marcenaria e ocorrências de pós-venda, tudo integrado ao CRM corporativo.\n\nFaz sentido analisarmos como agilizar esse controle operacional de ponta a ponta?'
  },
  {
    company: 'Criare',
    email: 'sac@criare.com.br',
    subject: 'Orçamentos de projetos de marcenaria na Criare',
    body: 'Iniciar a segunda-feira calculando o custo de insumos, ferragens e mão de obra de novos projetos planejados na Criare exige precisão extrema para não queimar a margem de lucro.\n\nEm <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a>, o orçamento de projetos é integrado ao estoque, permitindo precificar com base no custo atualizado de insumos de marcenaria e gerar propostas elegantes rapidamente.\n\nQue tal vermos como automatizar esse cálculo de orçamentos hoje?'
  },
  {
    company: 'Valcenter Planejados',
    email: 'contato@valcenter.com.br',
    subject: 'Gestão de pós-venda e funil na Valcenter',
    body: 'Quantos projetos apresentados aos clientes da Valcenter na semana passada estão parados no funil de vendas sem uma ação de reengajamento planejada para esta segunda-feira?\n\nCom o CRM Kanban do <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a>, o sistema analisa de forma inteligente leads frios ou sem contato e sugere ganchos personalizados de conversa para o seu comercial fechar mais negócios.\n\nPodemos ver como reaquecer suas propostas paradas com essa inteligência?'
  },
  {
    company: 'Balaroti',
    email: 'sac@balaroti.com.br',
    subject: 'Automação fiscal e de caixa no Balaroti hoje',
    body: 'Processar milhares de cupons e faturas de materiais de construção no Balaroti exige uma retaguarda fiscal robusta e integrada ao caixa para evitar filas e lentidões na segunda-feira.\n\nO <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> possui faturamento nativo e veloz para emissão de NF-e, totalmente integrado ao estoque físico e financeiro, reduzindo o tempo de atendimento do balcão.\n\nPodemos testar essa agilidade de PDV e faturamento fiscal hoje mesmo?'
  },
  {
    company: 'Cassol Centerlar',
    email: 'sac@cassol.com.br',
    subject: 'Prevenção de rupturas de estoque na Cassol',
    body: 'Evitar rupturas de estoque de materiais de acabamento na Cassol nesta segunda-feira é crítico para não perder vendas para concorrentes. O giro precisa ser cirúrgico.\n\nCom o controle de estoque integrado do <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a>, você monitora o estoque mínimo de cada centro de distribuição e gera listas automáticas de reposição com custos médios de compra.\n\nFaz sentido conversarmos sobre como blindar o estoque de suas lojas?'
  },
  {
    company: 'Sidlar Móveis',
    email: 'sac@sidlar.com.br',
    subject: 'Comissões de vendas de móveis na Sidlar',
    body: 'Segunda-feira na Sidlar Móveis é o dia clássico de apurar as metas e comissões de vendas dos consultores do final de semana. Se o cálculo ainda é manual, o tempo e os riscos são altos.\n\nO sistema de vendas do <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> calcula comissões automaticamente conforme regras flexíveis e integra diretamente ao módulo de RH e folha do financeiro.\n\nQue tal automatizarmos essa rotina de apuração para a sua equipe hoje?'
  },
  {
    company: 'Santa Emília Auto',
    email: 'sac@santaemilia.com.br',
    subject: 'Santa Emília: entrada segura de veículos na mecânica',
    body: 'A recepção de veículos para revisão na Santa Emília nesta segunda-feira exige segurança para evitar divergências ou acusações sobre danos pré-existentes. O papel não é mais suficiente.\n\nO sistema de Ordens de Serviço do <a href="https://seufluxoerp.com.br">seufluxoerp.com.br</a> conta com checklist de entrada fotográfico digital, integrado ao cadastro de placas, chassis e IMEI/Seriais de peças de reposição.\n\nPodemos fazer um teste rápido para digitalizar e blindar a sua recepção hoje?'
  }
];

async function sendEmail(prospect) {
  let imageBase64 = '';
  try {
    imageBase64 = fs.readFileSync(IMAGE_PATH).toString('base64');
  } catch (err) {
    console.warn(`Erro ao ler imagem do logo em ${IMAGE_PATH}. Enviando sem imagem de anexo. Detalhes:`, err.message);
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
    throw new Error(`Erro Resend para ${prospect.company}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  const logFile = path.join(__dirname, '../log_envios.md');
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '| Data | Empresa | Contato | E-mail | Status |\n|------|---------|---------|--------|--------|\n');
  }

  console.log(`Iniciando disparos para ${PROSPECTS.length} prospects REAIS do dia...`);
  
  for (const prospect of PROSPECTS) {
    try {
      console.log(`Enviando para ${prospect.company} (${prospect.email})...`);
      await sendEmail(prospect);
      console.log(`Sucesso: ${prospect.company}`);
      fs.appendFileSync(logFile, `| ${new Date().toISOString().split('T')[0]} | ${prospect.company} | - | ${prospect.email} | enviado |\n`);
      
      // Espera 5 segundos entre disparos para respeitar limites e evitar spam
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`Falha ao enviar para ${prospect.company}:`, error.message);
      fs.appendFileSync(logFile, `| ${new Date().toISOString().split('T')[0]} | ${prospect.company} | - | ${prospect.email} | erro: ${error.message} |\n`);
    }
  }
  
  console.log('Disparos reais de hoje concluídos.');
}

run();
