/**
 * WhatsApp Service — Fluxo ERP
 * Servidor Express principal do microserviço.
 */

import express from 'express';
import cors from 'cors';
import { WhatsAppSession } from './whatsapp';
import { MessageStore } from './store';
import { createRoutes } from './routes';

const PORT = parseInt(process.env.PORT || '3001', 10);
const API_KEY = process.env.API_KEY || 'fluxo-wa-secret-change-me';

console.log('================================================');
console.log('[Fluxo WhatsApp Service] VERSÃO 1.1.2 - ANTI-LOOP ATIVO');
console.log('================================================');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Autenticação via API Key
app.use((req, res, next) => {
  // Liberar health check sem autenticação
  if (req.path === '/health') {
    return next();
  }

  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    res.status(401).json({ error: 'API Key inválida.' });
    return;
  }
  next();
});

// Mapa global de sessões
const sessions = new Map<string, WhatsAppSession>();

function getSession(tenantId: string): WhatsAppSession {
  if (!sessions.has(tenantId)) {
    console.log(`[WhatsApp] Inicializando nova sessão para o tenant: ${tenantId}`);
    const store = new MessageStore();
    const session = new WhatsAppSession(tenantId, store);
    sessions.set(tenantId, session);
  }
  return sessions.get(tenantId)!;
}

// Registrar rotas
app.use('/', createRoutes(getSession));

// Iniciar servidor
<<<<<<< HEAD
app.listen(PORT, async () => {
  console.log(`[Fluxo WhatsApp Service] Rodando na porta ${PORT}`);
=======
app.listen(PORT, () => {
  console.log(`[Fluxo WhatsApp Service] Rodando na porta ${PORT} (Multi-Tenant)`);
>>>>>>> 8c8bc9b (feat: implement multi-tenant WhatsApp integration service with Baileys and API endpoints)
  console.log(`[Fluxo WhatsApp Service] Health: http://localhost:${PORT}/health`);

  // Só reconectar automaticamente se já houver credenciais salvas (sessão prévia).
  // Sem credenciais, esperar o usuário clicar "Conectar" no front-end para evitar
  // gerar QR codes em loop, o que leva o WhatsApp a bloquear novos dispositivos.
  if (session.hasSavedCredentials()) {
    console.log('[WhatsApp] Credenciais salvas encontradas. Reconectando automaticamente...');
    try {
      await session.connect();
    } catch (err) {
      console.error('[WhatsApp] Erro ao iniciar conexão no boot:', err);
    }
  } else {
    console.log('[WhatsApp] Nenhuma sessão salva. Aguardando conexão via front-end...');
  }
});
