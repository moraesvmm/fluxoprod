import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const GRAPH_VERSION = process.env.WHATSAPP_META_GRAPH_VERSION || 'v23.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

type MetaConfigRow = {
  empresa_id: string;
  phone_number_id: string;
  waba_id: string | null;
  access_token_ciphertext: string;
  app_secret_ciphertext: string | null;
  verify_token_hash: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  status: 'configured' | 'connected' | 'disabled' | 'error';
  last_error: string | null;
};

export type MetaConfigSummary = Omit<MetaConfigRow, 'access_token_ciphertext' | 'app_secret_ciphertext' | 'verify_token_hash'> & {
  configured: true;
};

type MetaConfigInternal = MetaConfigSummary & {
  accessToken: string;
  appSecret: string | null;
};

function encryptionKey(): Buffer {
  const secret = process.env.WHATSAPP_META_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('WHATSAPP_META_TOKEN_SECRET ausente ou muito curto.');
  }
  return createHash('sha256').update(secret).digest();
}

function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decryptToken(value: string): string {
  const [ivValue, tagValue, ciphertextValue] = value.split('.');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Token Meta armazenado em formato inválido.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function getAuthenticatedEmpresaId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('UNAUTHORIZED');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('empresa_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.empresa_id) throw new Error('COMPANY_NOT_FOUND');
  return profile.empresa_id;
}

function toInternalConfig(data: unknown): MetaConfigInternal {
  const row = data as MetaConfigRow;
  return {
    empresa_id: row.empresa_id,
    phone_number_id: row.phone_number_id,
    waba_id: row.waba_id,
    display_phone_number: row.display_phone_number,
    verified_name: row.verified_name,
    status: row.status,
    last_error: row.last_error,
    configured: true,
    accessToken: decryptToken(row.access_token_ciphertext),
    appSecret: row.app_secret_ciphertext ? decryptToken(row.app_secret_ciphertext) : null,
  };
}

const CONFIG_SELECT = 'empresa_id, phone_number_id, waba_id, access_token_ciphertext, app_secret_ciphertext, verify_token_hash, display_phone_number, verified_name, status, last_error';

export async function getMetaConfig(empresaId: string): Promise<MetaConfigInternal | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('empresa_whatsapp_meta')
    .select(CONFIG_SELECT)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return toInternalConfig(data);
}

export async function getMetaConfigByPhoneNumberId(phoneNumberId: string): Promise<MetaConfigInternal | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('empresa_whatsapp_meta')
    .select(CONFIG_SELECT)
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle();
  if (error) throw error;
  return data ? toInternalConfig(data) : null;
}

export async function getMetaConfigByVerifyToken(verifyToken: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('empresa_whatsapp_meta')
    .select('empresa_id')
    .eq('verify_token_hash', hashSecret(verifyToken))
    .eq('status', 'connected')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export function summarizeMetaConfig(config: MetaConfigInternal): MetaConfigSummary {
  const { accessToken, appSecret, ...summary } = config;
  void accessToken;
  void appSecret;
  return summary;
}

export async function saveMetaConfig(input: {
  empresaId: string;
  phoneNumberId: string;
  wabaId?: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
}): Promise<MetaConfigSummary> {
  if (!/^\d{5,25}$/.test(input.phoneNumberId)) throw new Error('PHONE_NUMBER_ID_INVALID');
  if (input.wabaId && !/^\d{5,25}$/.test(input.wabaId)) throw new Error('WABA_ID_INVALID');
  if (input.accessToken.length < 20 || input.accessToken.length > 4096) throw new Error('ACCESS_TOKEN_INVALID');
  if (input.appSecret.length < 20 || input.appSecret.length > 4096) throw new Error('APP_SECRET_INVALID');
  if (input.verifyToken.length < 16 || input.verifyToken.length > 512) throw new Error('VERIFY_TOKEN_INVALID');

  const validation = await metaGraphRequest(input.phoneNumberId, input.accessToken, {
    method: 'GET',
    searchParams: { fields: 'display_phone_number,verified_name' },
  });
  if (!validation.ok) throw new Error('META_TOKEN_INVALID');
  const metadata = await validation.json() as { display_phone_number?: string; verified_name?: string };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('empresa_whatsapp_meta')
    .upsert({
      empresa_id: input.empresaId,
      phone_number_id: input.phoneNumberId,
      waba_id: input.wabaId || null,
      access_token_ciphertext: encryptToken(input.accessToken),
      app_secret_ciphertext: encryptToken(input.appSecret),
      verify_token_hash: hashSecret(input.verifyToken),
      display_phone_number: metadata.display_phone_number || null,
      verified_name: metadata.verified_name || null,
      status: 'connected',
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'empresa_id' })
    .select('empresa_id, phone_number_id, waba_id, display_phone_number, verified_name, status, last_error')
    .single();
  if (error) throw error;
  return { ...(data as Omit<MetaConfigRow, 'access_token_ciphertext'>), configured: true };
}

export async function disableMetaConfig(empresaId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('empresa_whatsapp_meta')
    .update({ status: 'disabled', updated_at: new Date().toISOString() })
    .eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function metaGraphRequest(
  phoneNumberId: string,
  accessToken: string,
  options: { method?: string; body?: unknown; searchParams?: Record<string, string> } = {},
): Promise<Response> {
  const params = new URLSearchParams(options.searchParams);
  const url = `${GRAPH_URL}/${encodeURIComponent(phoneNumberId)}${params.size ? `?${params}` : ''}`;
  return fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
}

export async function metaSendText(config: MetaConfigSummary & { accessToken: string }, to: string, message: string) {
  return metaGraphRequest(config.phone_number_id, config.accessToken, {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { preview_url: false, body: message },
    },
  });
}

export async function storeMetaOutboundMessage(input: {
  empresaId: string;
  phone: string;
  body: string;
  messageId: string;
}) {
  const admin = createAdminClient();
  await admin.from('whatsapp_messages_meta').upsert({
    empresa_id: input.empresaId,
    wa_message_id: input.messageId,
    phone: input.phone,
    direction: 'outbound',
    message_type: 'text',
    body: input.body,
    payload: {},
    occurred_at: new Date().toISOString(),
  }, { onConflict: 'empresa_id,wa_message_id' });
}
