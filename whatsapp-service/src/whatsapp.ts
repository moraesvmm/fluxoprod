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
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import * as QRCode from 'qrcode';
import { MessageStore, Conversation, ChatMessage } from './store';
import path from 'path';
import fs from 'fs';

const logger = pino({ level: 'info' });

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
  private qrRetryCount = 0;
  private maxQrRetries = 3; // Max QR code generations before stopping

  constructor(store: MessageStore, authDir?: string) {
    this.store = store;
    // Prefer environment variable for persistent volume mounts in production (e.g., /data/auth_state)
    this.authDir = authDir || process.env.AUTH_DIR || path.join(process.cwd(), 'auth_state');
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

  /**
   * Checks if there are saved credentials that allow auto-reconnection.
   */
  hasSavedCredentials(): boolean {
    const credsPath = path.join(this.authDir, 'creds.json');
    return fs.existsSync(credsPath);
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
    const { version } = await fetchLatestBaileysVersion();
    console.log(`[WhatsApp] Usando Baileys v${version.join('.')}`);

    this.socket = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      version,
      // Fingerprint consistente: Mac OS + Safari para evitar detecção de bot
      // Não misturar Ubuntu/Desktop com Chrome — causa detecção pela Meta
      browser: ['Mac OS', 'Safari', '605.1.15'],
      markOnlineOnConnect: false, // não marcar online automaticamente
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      qrTimeout: 40000,
    });

    // Eventos de conexão
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrRetryCount++;
        console.log(`[WhatsApp] QR Code gerado (${this.qrRetryCount}/${this.maxQrRetries}).`);

        if (this.qrRetryCount > this.maxQrRetries) {
          console.log('[WhatsApp] Limite de QR codes atingido. Parando para evitar bloqueio.');
          this.status = 'disconnected';
          this.qrCode = null;
          this.qrBase64 = null;
          this.qrRetryCount = 0;
          if (this.socket) {
            this.socket.end(undefined);
            this.socket = null;
          }
          return;
        }

        this.qrCode = qr;
        this.qrBase64 = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        this.status = 'qr_pending';
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        console.log('[WhatsApp] Conexão fechada. Motivo:', reason);

        if (reason === DisconnectReason.loggedOut) {
          console.log('[WhatsApp] Sessão encerrada (logout). Limpando credenciais...');
          this.cleanup();
          this.status = 'disconnected';
          this.qrCode = null;
          this.qrBase64 = null;
        } else if (reason === 515) {
          // 515 = Stream restart required — ocorre APÓS escaneamento bem-sucedido do QR.
          console.log('[WhatsApp] Stream restart (515) — Pareamento confirmado. Reconectando com credenciais...');
          this.socket = null;
          this.status = 'disconnected'; // Deve ser disconnected para que o connect() não aborte
          setTimeout(() => {
            this.connect();
          }, 3000);
        } else if (reason === 408 || reason === DisconnectReason.timedOut) {
          // QR code timeout — Não reconectar automaticamente se não há credenciais salvas.
          if (this.hasSavedCredentials()) {
            this.reconnectAttempts++;
            console.log(`[WhatsApp] Timeout com credenciais salvas. Reconectando... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.status = 'connecting';
              setTimeout(() => this.connect(), 5000);
            } else {
              console.log('[WhatsApp] Máximo de tentativas de reconexão atingido.');
              this.status = 'disconnected';
              this.socket = null;
              this.reconnectAttempts = 0;
            }
          } else {
            console.log('[WhatsApp] QR expirou sem escaneamento. Aguardando nova solicitação do usuário.');
            this.status = 'disconnected';
            this.qrCode = null;
            this.qrBase64 = null;
            this.qrRetryCount = 0;
            this.socket = null;
          }
        } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.status = 'connecting';
          console.log(`[WhatsApp] Reconectando... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), 5000);
        } else {
          console.log('[WhatsApp] Máximo de tentativas de reconexão atingido.');
          this.status = 'disconnected';
          this.socket = null;
          this.reconnectAttempts = 0;
        }
      }

      if (connection === 'open') {
        this.status = 'connected';
        this.reconnectAttempts = 0;
        this.qrRetryCount = 0;
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

  public nuke(): void {
    console.log('[WhatsApp] NUKE: Apagando todas as credenciais e diretório de auth...');
    this.cleanup();
    if (this.socket) {
      this.socket.end(undefined);
      this.socket = null;
    }
    this.status = 'disconnected';
    this.qrCode = null;
    this.qrBase64 = null;
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
