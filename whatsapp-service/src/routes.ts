/**
 * Express Routes — Fluxo WhatsApp Service
 * Endpoints REST para interação com a sessão WhatsApp.
 */

import { Router, Request, Response } from 'express';
import { WhatsAppSession } from './whatsapp';

export function createRoutes(getSession: (tenantId: string) => WhatsAppSession): Router {
  const router = Router();

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Middleware para extrair tenantId
  router.use((req, res, next) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ error: 'Header x-tenant-id é obrigatório.' });
      return;
    }
    (req as any).tenantId = tenantId;
    next();
  });

  // Status da conexão
  router.get('/status', (req: Request, res: Response) => {
    const session = getSession((req as any).tenantId);
    const store = session.getStore();
    res.json({
      status: session.getStatus(),
      connected: session.getStatus() === 'connected',
      totalUnread: store.getTotalUnread(),
    });
  });

  // QR Code para pareamento
  router.get('/qr', (req: Request, res: Response) => {
    const session = getSession((req as any).tenantId);
    const qr = session.getQRBase64();
    const status = session.getStatus();

    if (status === 'connected') {
      res.json({ status: 'connected', qr: null, message: 'Já conectado.' });
      return;
    }

    if (!qr) {
      res.json({ status: session.getStatus(), qr: null, message: 'QR Code ainda não gerado. Aguarde...' });
      return;
    }

    res.json({ status: 'qr_pending', qr });
  });

  // Conectar sessão
  router.post('/connect', async (req: Request, res: Response) => {
    const session = getSession((req as any).tenantId);
    try {
      await session.connect();
      res.json({ success: true, message: 'Conexão iniciada. Escaneie o QR Code.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Desconectar sessão
  router.post('/disconnect', async (req: Request, res: Response) => {
    const session = getSession((req as any).tenantId);
    try {
      await session.disconnect();
      res.json({ success: true, message: 'Desconectado com sucesso.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Rota de Emergência: Limpar tudo
  router.post('/nuke', async (req: Request, res: Response) => {
    try {
      const session = getSession((req as any).tenantId);
      session.nuke();
      res.json({ success: true, message: 'Sessão e credenciais apagadas. Reinicie o serviço.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Enviar mensagem individual
  router.post('/send', async (req: Request, res: Response) => {
    const session = getSession((req as any).tenantId);
    const { to, message } = req.body;

    if (!to || !message) {
      res.status(400).json({ success: false, error: 'Campos "to" e "message" são obrigatórios.' });
      return;
    }

    const result = await session.sendMessage(to, message);
    res.json(result);
  });

  // Enviar mensagens em massa (campanha)
  router.post('/send-bulk', async (req: Request, res: Response) => {
    const session = getSession((req as any).tenantId);
    const { messages, delay_ms = 20000 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: 'Campo "messages" deve ser um array não vazio.' });
      return;
    }

    // Limite anti-spam: máximo 50 mensagens por campanha
    if (messages.length > 50) {
      res.status(400).json({ success: false, error: 'Máximo de 50 mensagens por campanha.' });
      return;
    }

    const result = await session.sendBulk(messages, Math.max(delay_ms, 15000));
    res.json({ success: true, ...result });
  });

  // Listar conversas
  router.get('/conversations', (req: Request, res: Response) => {
    const session = getSession((req as any).tenantId);
    const store = session.getStore();
    const conversations = store.getConversations().map((c) => ({
      phone: c.phone,
      name: c.name,
      lastMessage: c.lastMessage,
      lastTimestamp: c.lastTimestamp,
      unreadCount: c.unreadCount,
    }));
    res.json({ conversations, totalUnread: store.getTotalUnread() });
  });

  // Obter mensagens de uma conversa
  router.get('/messages/:phone', (req: Request, res: Response) => {
    const session = getSession((req as any).tenantId);
    const phone = req.params.phone as string;
    const store = session.getStore();

    const messages = store.getMessages(phone);
    store.markAsRead(phone);

    res.json({ phone, messages, totalUnread: store.getTotalUnread() });
  });

  // Obter arquivo de mídia binário
  router.get('/media/:id', (req: Request, res: Response) => {
    const messageId = req.params.id;
    const session = getSession((req as any).tenantId);
    const mediaStore = session.getMediaStore();
    
    const media = mediaStore.get(messageId);
    if (!media) {
      res.status(404).json({ error: 'Mídia não encontrada ou já expirou.' });
      return;
    }

    res.setHeader('Content-Type', media.mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(media.buffer);
  });

  return router;
}
