/**
 * In-Memory Message Store — Fluxo ERP
 * Armazena mensagens e conversas em memória para acesso rápido.
 * Release 2 migrará para persistência em banco de dados.
 */

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  fromMe: boolean;
  pushName?: string;
  type?: 'text' | 'audio' | 'sticker' | 'image' | 'video' | 'document' | 'contact' | 'location' | 'unknown';
}

export interface Conversation {
  phone: string;
  name: string;
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
  messages: ChatMessage[];
}

export class MessageStore {
  private conversations: Map<string, Conversation> = new Map();
  private maxMessagesPerConversation = 100;

  addMessage(phone: string, message: ChatMessage): void {
    let convo = this.conversations.get(phone);

    if (!convo) {
      convo = {
        phone,
        name: message.pushName || phone,
        lastMessage: message.text,
        lastTimestamp: message.timestamp,
        unreadCount: 0,
        messages: [],
      };
      this.conversations.set(phone, convo);
    }

    // Atualizar nome se disponível
    if (message.pushName && message.pushName !== phone) {
      convo.name = message.pushName;
    }

    convo.lastMessage = message.text;
    convo.lastTimestamp = message.timestamp;

    // Incrementar não lidas apenas para mensagens recebidas
    if (!message.fromMe) {
      convo.unreadCount++;
    }

    // Adicionar mensagem, limitando o tamanho
    convo.messages.push(message);
    if (convo.messages.length > this.maxMessagesPerConversation) {
      convo.messages = convo.messages.slice(-this.maxMessagesPerConversation);
    }
  }

  getConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }

  getMessages(phone: string): ChatMessage[] {
    return this.conversations.get(phone)?.messages || [];
  }

  markAsRead(phone: string): void {
    const convo = this.conversations.get(phone);
    if (convo) {
      convo.unreadCount = 0;
    }
  }

  getTotalUnread(): number {
    let total = 0;
    for (const convo of this.conversations.values()) {
      total += convo.unreadCount;
    }
    return total;
  }

  getConversation(phone: string): Conversation | undefined {
    return this.conversations.get(phone);
  }
}
