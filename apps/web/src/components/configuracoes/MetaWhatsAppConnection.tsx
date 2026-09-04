"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Save, Trash2, Wifi } from "lucide-react";

interface MetaConfigSummary {
  phone_number_id: string;
  waba_id: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  status: string;
}

export function MetaWhatsAppConnection() {
  const [config, setConfig] = useState<MetaConfigSummary | null>(null);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/whatsapp/meta/config")
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar a configuração Meta.");
        return response.json() as Promise<{ config?: MetaConfigSummary | null }>;
      })
      .then((result) => {
        if (active && result.config) {
          setConfig(result.config);
          setPhoneNumberId(result.config.phone_number_id);
          setWabaId(result.config.waba_id || "");
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Erro ao carregar configuração.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/meta/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId, wabaId, accessToken }),
      });
      const result = await response.json() as { config?: MetaConfigSummary; error?: string };
      if (!response.ok || !result.config) throw new Error(result.error || "Não foi possível validar o token Meta.");
      setConfig(result.config);
      setAccessToken("");
      setMessage("WhatsApp Meta conectado com sucesso.");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/meta/config", { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível desativar a conexão Meta.");
      setConfig(null);
      setAccessToken("");
      setMessage("Conexão Meta desativada.");
    } catch (disableError: unknown) {
      setError(disableError instanceof Error ? disableError.message : "Erro ao desativar conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
          <Wifi className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">WhatsApp Cloud API da Meta</h3>
          <p className="text-xs text-muted-foreground">Conexão por número oficial, sem QR Code ou WhatsApp Web.</p>
        </div>
      </div>

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
        <>
          {config && (
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Conectado pela Meta</div>
              <p className="mt-1">{config.verified_name || "Número verificado"} {config.display_phone_number ? `(${config.display_phone_number})` : ""}</p>
              <p className="mt-1 text-xs">Phone Number ID: {config.phone_number_id}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="meta-phone-number-id">Phone Number ID</label>
              <input id="meta-phone-number-id" value={phoneNumberId} onChange={(event) => setPhoneNumberId(event.target.value)} required inputMode="numeric" autoComplete="off" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="ID do número no Meta Business" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="meta-waba-id">WhatsApp Business Account ID</label>
              <input id="meta-waba-id" value={wabaId} onChange={(event) => setWabaId(event.target.value)} inputMode="numeric" autoComplete="off" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Opcional" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="meta-access-token">Token de acesso permanente</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input id="meta-access-token" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} required type="password" autoComplete="new-password" className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm" placeholder={config ? "Informe o novo token para atualizar" : "Token fornecido pela Meta"} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">O token é validado no Graph API e armazenado cifrado. Nunca é exibido novamente.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="meta-app-secret">App Secret da Meta</label>
              <input id="meta-app-secret" value={appSecret} onChange={(event) => setAppSecret(event.target.value)} required type="password" autoComplete="new-password" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="App Secret desta empresa" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="meta-verify-token">Verify Token do webhook</label>
              <input id="meta-verify-token" value={verifyToken} onChange={(event) => setVerifyToken(event.target.value)} required type="password" autoComplete="new-password" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Token definido no Meta Business" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={saving || !phoneNumberId || !accessToken || !appSecret || !verifyToken} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {config ? "Atualizar conexão" : "Conectar Meta"}
              </button>
              {config && <button type="button" onClick={handleDisable} disabled={saving} className="inline-flex items-center gap-2 rounded-md border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive disabled:opacity-50"><Trash2 className="h-4 w-4" /> Desativar</button>}
            </div>
          </form>

          {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          <p className="mt-5 text-xs text-muted-foreground">Configure o webhook da Meta para <code>/api/whatsapp/meta/webhook</code> e use o token de verificação definido pelo administrador.</p>
        </>
      )}
    </div>
  );
}
