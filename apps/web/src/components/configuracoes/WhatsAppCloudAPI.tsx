/**
 * WhatsAppCloudAPI.tsx — Fluxo ERP
 * 
 * Componente de configuração da integração WhatsApp Cloud API (Meta Oficial).
 * Permite que empresas aprovadas no Meta Business conectem seus números
 * diretamente pelo módulo de Configurações.
 * 
 * Cada tenant recebe um webhook_verify_token único gerado automaticamente.
 * O access_token é armazenado de forma segura e NUNCA retorna completo ao navegador.
 * 
 * Fluxo esperado para a empresa:
 * 1. Criar conta no Meta Business Suite (business.facebook.com)
 * 2. Criar um App no developers.facebook.com
 * 3. Adicionar o produto "WhatsApp" ao App
 * 4. Obter aprovação e gerar Access Token permanente
 * 5. Copiar Phone Number ID e WhatsApp Business Account ID
 * 6. Colar os dados aqui e salvar
 * 7. Configurar o webhook no painel da Meta com URL e Verify Token gerados aqui
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Trash2,
  RefreshCw,
  Shield,
  Zap,
  BookOpen,
} from 'lucide-react';

interface CloudApiConfig {
  configurado: boolean;
  ativo: boolean;
  phone_number_id?: string;
  waba_id?: string;
  webhook_verify_token?: string;
  access_token_hint?: string;
  conectado_em?: string;
}

interface WhatsAppCloudAPIProps {
  /** Callback para notificar o componente pai se a Cloud API está ativa */
  onStatusChange?: (ativo: boolean) => void;
}

export function WhatsAppCloudAPI({ onStatusChange }: WhatsAppCloudAPIProps) {
  const [config, setConfig] = useState<CloudApiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Form fields
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');

  // UI feedback
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Webhook URL — detecta o domínio automaticamente
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/whatsapp-meta`
    : 'https://seufluxoerp.com.br/api/webhooks/whatsapp-meta';

  const showMsg = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // Buscar configuração atual
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp-meta/config');
      if (!res.ok) throw new Error('Erro ao buscar configuração');
      const data = await res.json();
      setConfig(data);
      onStatusChange?.(data?.ativo ?? false);

      // Preencher form com dados existentes (exceto token por segurança)
      if (data?.configurado) {
        setPhoneNumberId(data.phone_number_id || '');
        setWabaId(data.waba_id || '');
      }
    } catch {
      setConfig({ configurado: false, ativo: false });
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Salvar credenciais
  const handleSave = async () => {
    if (!accessToken.trim() && !config?.configurado) {
      showMsg('error', 'Access Token é obrigatório.');
      return;
    }
    if (!phoneNumberId.trim()) {
      showMsg('error', 'Phone Number ID é obrigatório.');
      return;
    }
    if (!wabaId.trim()) {
      showMsg('error', 'WhatsApp Business Account ID é obrigatório.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/whatsapp-meta/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken || undefined,
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      setConfig({
        configurado: true,
        ativo: true,
        phone_number_id: data.phone_number_id,
        waba_id: data.waba_id,
        webhook_verify_token: data.webhook_verify_token,
        access_token_hint: data.access_token_hint,
        conectado_em: new Date().toISOString(),
      });
      setAccessToken(''); // Limpar campo por segurança
      onStatusChange?.(true);
      showMsg('success', 'Cloud API configurada com sucesso! Agora configure o webhook no painel da Meta.');
    } catch (err) {
      showMsg('error', err instanceof Error ? err.message : 'Erro ao salvar configuração.');
    } finally {
      setSaving(false);
    }
  };

  // Testar conexão
  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await fetch('/api/whatsapp-meta/config');
      const data = await res.json();

      if (data?.ativo) {
        showMsg('success', 'Conexão com a Cloud API verificada com sucesso!');
      } else {
        showMsg('error', 'Cloud API não está ativa. Verifique as credenciais.');
      }
    } catch {
      showMsg('error', 'Erro ao testar conexão.');
    } finally {
      setTesting(false);
    }
  };

  // Remover integração
  const handleRemove = async () => {
    try {
      setRemoving(true);
      const res = await fetch('/api/whatsapp-meta/config', { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover');

      setConfig({ configurado: false, ativo: false });
      setAccessToken('');
      setPhoneNumberId('');
      setWabaId('');
      onStatusChange?.(false);
      showMsg('info', 'Integração Cloud API removida.');
    } catch {
      showMsg('error', 'Erro ao remover integração.');
    } finally {
      setRemoving(false);
    }
  };

  // Copiar para clipboard
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando configuração Cloud API...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
          </div>
          WhatsApp Cloud API
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Meta Oficial
          </span>
        </h3>
        {config?.ativo && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Conectado
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Integração oficial com a API da Meta para WhatsApp Business. Sem QR code, sem risco de bloqueio.
      </p>

      {/* Mensagem de feedback */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg border text-sm flex items-start gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          message.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-500' :
          'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-500'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> :
           message.type === 'error' ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> :
           <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Guia informativo — sempre visível para novos, toggle para existentes */}
      <div className="mb-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          {showGuide ? 'Ocultar guia de configuração' : 'Como configurar a Cloud API?'}
        </button>

        {(showGuide || !config?.configurado) && (
          <div className="mt-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20/50 dark:border-blue-800/30">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Passo a passo para conectar
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-blue-800 dark:text-blue-500 dark:text-blue-300">
              <div className="bg-card/60 dark:bg-card/5 p-3 rounded-lg border border-blue-200 dark:border-blue-500/20/40">
                <span className="font-bold block mb-1">1. Crie um Meta App</span>
                Acesse{' '}
                <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-0.5">
                  developers.facebook.com <ExternalLink className="h-3 w-3" />
                </a>{' '}
                e crie um App do tipo &quot;Business&quot;. Adicione o produto &quot;WhatsApp&quot;.
              </div>
              <div className="bg-card/60 dark:bg-card/5 p-3 rounded-lg border border-blue-200 dark:border-blue-500/20/40">
                <span className="font-bold block mb-1">2. Obtenha as credenciais</span>
                No painel do App, vá em WhatsApp → Configuração da API. Copie o <strong>Access Token permanente</strong>, <strong>Phone Number ID</strong> e <strong>Business Account ID</strong>.
              </div>
              <div className="bg-card/60 dark:bg-card/5 p-3 rounded-lg border border-blue-200 dark:border-blue-500/20/40">
                <span className="font-bold block mb-1">3. Cole aqui e salve</span>
                Preencha os campos abaixo com as credenciais obtidas e clique em &quot;Salvar&quot;. O sistema validará automaticamente com a API da Meta.
              </div>
              <div className="bg-card/60 dark:bg-card/5 p-3 rounded-lg border border-blue-200 dark:border-blue-500/20/40">
                <span className="font-bold block mb-1">4. Configure o Webhook</span>
                No painel da Meta, vá em Webhooks e configure a <strong>Callback URL</strong> e o <strong>Verify Token</strong> que serão exibidos abaixo após salvar.
              </div>
            </div>
            <p className="mt-3 text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Seus tokens são armazenados de forma segura e criptografada. Nunca são expostos ao navegador.
            </p>
          </div>
        )}
      </div>

      {/* Formulário de credenciais */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Access Token Permanente *
            </label>
            {config?.configurado ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted/30 border border-border rounded-md px-3 py-2 text-sm font-mono text-muted-foreground">
                  {config.access_token_hint || '••••••••••'}
                </div>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  placeholder="Cole o novo token para atualizar"
                />
              </div>
            ) : (
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="EAAxxxxxxx..."
              />
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              Gere um token permanente no painel do Meta App (System Users → Generate Token).
            </p>
          </div>

          {/* Phone Number ID & WABA ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Phone Number ID *
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground font-mono"
                placeholder="Ex: 123456789012345"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Encontrado em WhatsApp → Configuração da API no painel Meta.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                WhatsApp Business Account ID *
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground font-mono"
                placeholder="Ex: 987654321098765"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                WABA ID disponível nas configurações do App Meta.
              </p>
            </div>
          </div>
        </div>

        {/* Webhook info — só aparece após configuração salva */}
        {config?.configurado && config?.webhook_verify_token && (
          <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-500/10/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20/50 dark:border-amber-800/30 space-y-3">
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Configure estes dados no painel Webhooks da Meta
            </h4>

            {/* Webhook URL */}
            <div>
              <label className="block text-[11px] font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1">
                Callback URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-card dark:bg-black/20 border border-amber-200 dark:border-amber-500/20 dark:border-amber-700 rounded-md px-3 py-2 text-xs font-mono text-foreground break-all">
                  {webhookUrl}
                </code>
                <button
                  onClick={() => handleCopy(webhookUrl, 'url')}
                  className="shrink-0 p-2 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-amber-700 dark:text-amber-500 dark:text-amber-400"
                  title="Copiar URL"
                >
                  {copiedField === 'url' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Verify Token */}
            <div>
              <label className="block text-[11px] font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1">
                Verify Token
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-card dark:bg-black/20 border border-amber-200 dark:border-amber-500/20 dark:border-amber-700 rounded-md px-3 py-2 text-xs font-mono text-foreground">
                  {config.webhook_verify_token}
                </code>
                <button
                  onClick={() => handleCopy(config.webhook_verify_token!, 'token')}
                  className="shrink-0 p-2 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-amber-700 dark:text-amber-500 dark:text-amber-400"
                  title="Copiar Verify Token"
                >
                  {copiedField === 'token' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 dark:text-amber-500 dark:text-amber-400">
              Inscreva-se nos campos: <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">messages</code> e{' '}
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">message_template_status_update</code>
            </p>
          </div>
        )}

        {/* Status de conexão */}
        {config?.configurado && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${config.ativo ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {config.ativo ? 'Cloud API Ativa' : 'Cloud API Inativa'}
                </p>
                {config.conectado_em && (
                  <p className="text-[11px] text-muted-foreground">
                    Configurado em {new Date(config.conectado_em).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-mono">
                Phone: {config.phone_number_id}
              </span>
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || (!accessToken && !config?.configurado) || !phoneNumberId || !wabaId}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {config?.configurado ? 'Atualizar' : 'Salvar e Validar'}
              </>
            )}
          </button>

          {config?.configurado && (
            <>
              <button
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-md bg-muted border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Testar Conexão
              </button>

              <button
                onClick={handleRemove}
                disabled={removing}
                className="inline-flex items-center gap-2 rounded-md border border-red-200 dark:border-red-500/20 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:bg-red-500/10 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors ml-auto"
              >
                {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Desconectar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
