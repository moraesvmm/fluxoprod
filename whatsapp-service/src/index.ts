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
app.listen(PORT, async () => {
  console.log(`[Fluxo WhatsApp Service] Rodando na porta ${PORT} (Multi-Tenant)`);
  console.log(`[Fluxo WhatsApp Service] Health: http://localhost:${PORT}/health`);

  // Restaurar sessões ativas lendo a pasta auth_state
  const fs = require('fs');
  const path = require('path');
  const baseAuthDir = process.env.AUTH_DIR || path.join(process.cwd(), 'auth_state');
  
  if (fs.existsSync(baseAuthDir)) {
    const tenants = fs.readdirSync(baseAuthDir);
    for (const tenantId of tenants) {
      if (fs.statSync(path.join(baseAuthDir, tenantId)).isDirectory()) {
        console.log(`[WhatsApp] Restaurando sessão do tenant: ${tenantId}...`);
        try {
          const session = getSession(tenantId);
          // O método connect() de session precisaria existir/estar exposto.
          // Se session.connect() existir em WhatsAppSession, chamaremos:
          if (typeof (session as any).connect === 'function') {
            await (session as any).connect();
          }
        } catch (err) {
          console.error(`[WhatsApp] Erro ao restaurar tenant ${tenantId}:`, err);
        }
      }
    }
  } else {
    console.log('[WhatsApp] Nenhuma sessão multi-tenant salva encontrada no disco.');
  }
});
