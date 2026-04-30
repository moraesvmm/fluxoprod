/**
 * WhatsApp Session Manager — Fluxo ERP
 * Gerencia a conexão Baileys, QR Code, envio/recebimento de mensagens.
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import * as QRCode from 'qrcode';
import { MessageStore, Conversation, ChatMessage } from './store';
import path from 'path';
import fs from 'fs';

const logger = pino({ level: 'silent' });

export type ConnectionStatus = 'disconnected' | 'qr_pending' | 'connecting' | 'connected';

export class WhatsAppSession {
  private socket: WASocket | null = null;
  private qrCode: string | null = null;
  private qrBase64: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private store: MessageStore;
  private authDir: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(store: MessageStore, authDir?: string) {
    this.store = store;
    this.authDir = authDir || path.join(process.cwd(), 'auth_state');
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getQRBase64(): string | null {
    return this.qrBase64;
  }

  getStore(): MessageStore {
    return this.store;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.status = 'connecting';

    // Garante que o diretório de auth existe
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    this.socket = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: true,
      browser: ['Fluxo ERP', 'Chrome', '22.0'],
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
    });

    // Eventos de conexão
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        this.qrBase64 = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        this.status = 'qr_pending';
        console.log('[WhatsApp] QR Code gerado. Aguardando escaneamento...');
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;

        if (reason === DisconnectReason.loggedOut) {
          console.log('[WhatsApp] Sessão encerrada (logout). Limpando credenciais...');
          this.cleanup();
          this.status = 'disconnected';
          this.qrCode = null;
          this.qrBase64 = null;
        } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[WhatsApp] Reconectando... (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), 3000);
        } else {
          console.log('[WhatsApp] Máximo de tentativas de reconexão atingido.');
          this.status = 'disconnected';
        }
      }

      if (connection === 'open') {
        this.status = 'connected';
        this.reconnectAttempts = 0;
        this.qrCode = null;
        this.qrBase64 = null;
        console.log('[WhatsApp] Conectado com sucesso!');
      }
    });

    // Salvar credenciais quando atualizadas
    this.socket.ev.on('creds.update', saveCreds);

    // Receber mensagens
    this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;
        if (!jid || jid === 'status@broadcast') continue;

        // Extrair número do JID (ex: 5511967203563@s.whatsapp.net → 5511967203563)
        const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');

        // Extrair texto da mensagem
        const text = this.extractMessageText(msg);
        if (!text) continue;

        // Extrair nome do contato
        const pushName = msg.pushName || phone;

        const chatMessage: ChatMessage = {
          id: msg.key.id || Date.now().toString(),
          from: phone,
          to: 'me',
          text,
          timestamp: (msg.messageTimestamp as number) * 1000 || Date.now(),
          fromMe: false,
          pushName,
        };

        this.store.addMessage(phone, chatMessage);
        console.log(`[WhatsApp] Mensagem recebida de ${pushName} (${phone}): ${text.substring(0, 50)}...`);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
    }
    this.cleanup();
    this.status = 'disconnected';
    this.qrCode = null;
    this.qrBase64 = null;
    console.log('[WhatsApp] Desconectado.');
  }

  async sendMessage(phone: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.status !== 'connected' || !this.socket) {
      return { success: false, error: 'WhatsApp não está conectado.' };
    }

    try {
      // Normalizar número: remover caracteres e garantir formato
      const cleanPhone = phone.replace(/\D/g, '');
      const jid = `${cleanPhone}@s.whatsapp.net`;

      const result = await this.socket.sendMessage(jid, { text });

      const chatMessage: ChatMessage = {
        id: result?.key?.id || Date.now().toString(),
        from: 'me',
        to: cleanPhone,
        text,
        timestamp: Date.now(),
        fromMe: true,
      };

      this.store.addMessage(cleanPhone, chatMessage);

      return { success: true, messageId: result?.key?.id || undefined };
    } catch (err: any) {
      console.error('[WhatsApp] Erro ao enviar mensagem:', err.message);
      return { success: false, error: err.message };
    }
  }

  async sendBulk(
    messages: Array<{ to: string; message: string }>,
    delayMs: number = 20000
  ): Promise<{ enviados: number; falhas: number; total: number }> {
    let enviados = 0;
    let falhas = 0;

    for (let i = 0; i < messages.length; i++) {
      const { to, message } = messages[i];
      const result = await this.sendMessage(to, message);

      if (result.success) {
        enviados++;
      } else {
        falhas++;
      }

      // Delay anti-spam entre mensagens (exceto na última)
      if (i < messages.length - 1) {
        await this.sleep(delayMs);
      }
    }

    return { enviados, falhas, total: messages.length };
  }

  private extractMessageText(msg: proto.IWebMessageInfo): string | null {
    const m = msg.message;
    if (!m) return null;

    return (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      (m.contactMessage ? `[Contato: ${m.contactMessage.displayName}]` : null) ||
      (m.locationMessage ? `[Localização: ${m.locationMessage.degreesLatitude}, ${m.locationMessage.degreesLongitude}]` : null) ||
      (m.audioMessage ? '[Áudio]' : null) ||
      (m.stickerMessage ? '[Figurinha]' : null) ||
      null
    );
  }

  private cleanup(): void {
    if (fs.existsSync(this.authDir)) {
      fs.rmSync(this.authDir, { recursive: true, force: true });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
