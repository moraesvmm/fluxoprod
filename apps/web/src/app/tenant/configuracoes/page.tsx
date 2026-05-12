"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Save,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useEmpresa, useUpdateEmpresa } from "@/lib/hooks/use-empresas";
import { useToast, Toast } from "@/components/ui/toast";
import { TutorialSettingsSection } from "@/components/onboarding/TutorialSettingsSection";
import { FiscalGuide } from "@/components/modules/fiscal/FiscalGuide";
import { WhatsAppConnection } from "@/components/configuracoes/WhatsAppConnection";
import { UserManagement } from "@/components/configuracoes/UserManagement";

interface FiscalConfigState {
  inscricao_estadual: string;
  inscricao_municipal: string;
  regime_tributario: string;
  nfe_ambiente: "producao" | "homologacao";
  codigo_municipio_ibge: string;
  certificado_configurado: boolean;
  senha_certificado_configurada: boolean;
}

export default function ConfiguracoesPage() {
  const { data: empresa, isLoading } = useEmpresa();
  const updateMutation = useUpdateEmpresa();
  const { toasts, success, error: toastError, removeToast } = useToast();

  const [formData, setFormData] = useState({
    razao_social: "",
    cnpj: "",
    porte: "",
    segmento: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
    codigo_municipio_ibge: "",
  });
  const [fiscalForm, setFiscalForm] = useState({
    inscricao_estadual: "",
    inscricao_municipal: "",
    regime_tributario: "",
    nfe_ambiente: "homologacao" as "producao" | "homologacao",
    codigo_municipio_ibge: "",
    nfe_certificado_senha: "",
  });
  const [fiscalMeta, setFiscalMeta] = useState<FiscalConfigState | null>(null);
  const [fiscalLoading, setFiscalLoading] = useState(true);
  const [fiscalSaving, setFiscalSaving] = useState(false);
  const [certificateUploading, setCertificateUploading] = useState(false);

  useEffect(() => {
    if (!empresa) return;

    setFormData({
      razao_social: empresa.razao_social || "",
      cnpj: empresa.cnpj || "",
      porte: empresa.porte || "",
      segmento: empresa.segmento || "",
      logradouro: empresa.logradouro || "",
      numero: empresa.numero || "",
      complemento: empresa.complemento || "",
      bairro: empresa.bairro || "",
      cidade: empresa.cidade || "",
      uf: empresa.uf || "",
      cep: empresa.cep || "",
      codigo_municipio_ibge: empresa.codigo_municipio_ibge || "",
    });
  }, [empresa]);

  useEffect(() => {
    let cancelled = false;

    const loadFiscalConfig = async () => {
      try {
        setFiscalLoading(true);
        const response = await fetch("/api/tenant/fiscal-config", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Falha ao carregar configuração fiscal.");
        }

        if (cancelled) return;

        const config = payload.config as FiscalConfigState;
        setFiscalMeta(config);
        setFiscalForm({
          inscricao_estadual: config.inscricao_estadual || "",
          inscricao_municipal: config.inscricao_municipal || "",
          regime_tributario: config.regime_tributario || "",
          nfe_ambiente: config.nfe_ambiente || "homologacao",
          codigo_municipio_ibge: config.codigo_municipio_ibge || "",
          nfe_certificado_senha: "",
        });
      } catch (err: unknown) {
        if (!cancelled) {
          toastError("Erro ao carregar configuração fiscal: " + (err instanceof Error ? err.message : "Tente novamente."));
        }
      } finally {
        if (!cancelled) {
          setFiscalLoading(false);
        }
      }
    };

    loadFiscalConfig();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Carregar apenas uma vez — toastError não é estável entre renders

  const handleSave = async () => {
    if (!empresa?.id) return;

    try {
      await updateMutation.mutateAsync({
        id: empresa.id,
        empresa: {
          razao_social: formData.razao_social,
          cnpj: formData.cnpj,
          porte: formData.porte,
          segmento: formData.segmento,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          uf: formData.uf,
          cep: formData.cep,
          codigo_municipio_ibge: formData.codigo_municipio_ibge,
        },
      });
      success("Configurações gerais salvas com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao salvar configurações: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const handleSaveFiscal = async () => {
    try {
      setFiscalSaving(true);
      const response = await fetch("/api/tenant/fiscal-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fiscalForm),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Falha ao salvar configuração fiscal.");
      }

      const config = payload.config as FiscalConfigState;
      setFiscalMeta(config);
      setFiscalForm((current) => ({
        ...current,
        nfe_certificado_senha: "",
      }));
      success("Configurações fiscais salvas com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao salvar configurações fiscais: " + (err instanceof Error ? err.message : "Tente novamente."));
    } finally {
      setFiscalSaving(false);
    }
  };

  const handleCertificateUpload = async (file?: File) => {
    if (!file) return;

    try {
      setCertificateUploading(true);
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/tenant/fiscal-certificate", {
        method: "POST",
        body,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Falha ao enviar certificado.");
      }

      setFiscalMeta((current) =>
        current ? { ...current, certificado_configurado: true } : current
      );
      success("Certificado enviado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao enviar certificado: " + (err instanceof Error ? err.message : "Tente novamente."));
    } finally {
      setCertificateUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Ajuste os parâmetros da sua empresa e integrações.</p>
      </div>

      {!empresa ? (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-center text-muted-foreground font-medium">
          Nenhuma empresa vinculada à sua conta foi encontrada.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
              <Settings className="h-5 w-5 text-primary" /> Dados da Empresa
            </h3>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground/80">Razão Social *</label>
                <input
                  type="text"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80">CNPJ</label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80">Porte</label>
                <select
                  value={formData.porte}
                  onChange={(e) => setFormData({ ...formData, porte: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                >
                  <option value="">Selecione...</option>
                  <option value="micro">Microempresa</option>
                  <option value="pequeno">Pequeno Porte</option>
                  <option value="medio">Médio Porte</option>
                  <option value="grande">Grande Empresa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80">Segmento</label>
                <input
                  type="text"
                  value={formData.segmento}
                  onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Ex: Varejo, Tecnologia..."
                />
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 opacity-70">Endereço Fiscal</h4>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground/80">CEP</label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground/80">Logradouro (Rua/Av)</label>
                  <input
                    type="text"
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80">Número</label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80">Complemento</label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80">Bairro</label>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground/80">Cidade</label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                    className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80">Código IBGE do Município</label>
                  <input
                    type="text"
                    maxLength={7}
                    value={formData.codigo_municipio_ibge}
                    onChange={(e) => setFormData({ ...formData, codigo_municipio_ibge: e.target.value.replace(/\D/g, "") })}
                    className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                    placeholder="Ex: 4314902"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || !formData.razao_social}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <>Salvando...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" /> Configurações Fiscais (NFe)
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              A emissão nativa em Node.js usa somente o backend do Next.js. Segredos fiscais não voltam mais para o navegador.
            </p>

            {fiscalLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Carregando configurações fiscais...
              </div>
            ) : (
              <>
                <div className="mb-8 p-4 rounded-lg bg-blue-50 border border-blue-100 flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-1">Iniciando com Notas Fiscais no Fluxo?</h4>
                    <p className="text-xs text-blue-800 leading-relaxed mb-3">
                      Para emitir NF-e no fluxo nativo, sua empresa precisa operar no <strong>Simples Nacional</strong>, possuir certificado A1 e estar credenciada para emissão em software próprio na SEFAZ da UF correspondente.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div className="bg-white/50 p-2 rounded border border-blue-200">
                        <span className="font-bold text-blue-900 block mb-1">1. Simples Nacional + Certificado A1</span>
                        O certificado é usado pelo backend para assinar o XML da NF-e com validade jurídica.
                      </div>
                      <div className="bg-white/50 p-2 rounded border border-blue-200">
                        <span className="font-bold text-blue-900 block mb-1">2. Credenciamento e UF suportada</span>
                        O fluxo nativo atende RS, SP, MG e estados operados pela SVRS. Solicite ao contador o credenciamento para emissão via software próprio.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Inscrição Estadual</label>
                    <input
                      type="text"
                      value={fiscalForm.inscricao_estadual}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, inscricao_estadual: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground placeholder:text-muted-foreground"
                      placeholder="Isento se não possuir"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Inscrição Municipal</label>
                    <input
                      type="text"
                      value={fiscalForm.inscricao_municipal}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, inscricao_municipal: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Regime Tributário</label>
                    <select
                      value={fiscalForm.regime_tributario}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, regime_tributario: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                    >
                      <option value="">Selecione...</option>
                      <option value="1">Simples Nacional</option>
                    </select>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      A emissão nativa de NF-e do Fluxo está habilitada somente para empresas do Simples Nacional.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Código IBGE do Município</label>
                    <input
                      type="text"
                      maxLength={7}
                      value={fiscalForm.codigo_municipio_ibge}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, codigo_municipio_ibge: e.target.value.replace(/\D/g, "") })}
                      className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground placeholder:text-muted-foreground"
                      placeholder="Ex: 4314902"
                    />
                  </div>

                  <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-foreground uppercase tracking-wider opacity-70">Ambiente de Emissão Nativa</h4>
                      <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border border-border">
                        <button
                          onClick={() => setFiscalForm({ ...fiscalForm, nfe_ambiente: "homologacao" })}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${fiscalForm.nfe_ambiente === "homologacao" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}
                        >
                          Homologação
                        </button>
                        <button
                          onClick={() => setFiscalForm({ ...fiscalForm, nfe_ambiente: "producao" })}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${fiscalForm.nfe_ambiente === "producao" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}
                        >
                          Produção
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-border pt-6">
                      <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2 opacity-70">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Certificado e Credenciais
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground/80">Certificado Digital (.pfx / .p12)</label>
                          <div className="mt-1 flex items-center gap-4">
                            <input
                              type="file"
                              accept=".pfx,.p12"
                              onChange={(e) => handleCertificateUpload(e.target.files?.[0])}
                              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 ${fiscalMeta?.certificado_configurado ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {fiscalMeta?.certificado_configurado ? "Certificado configurado" : "Certificado pendente"}
                            </span>
                            {certificateUploading && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-1">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Enviando...
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400">
                            O arquivo será armazenado de forma segura e só ficará acessível server-side.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground/80">Senha do Certificado</label>
                          <input
                            type="password"
                            value={fiscalForm.nfe_certificado_senha}
                            onChange={(e) => setFiscalForm({ ...fiscalForm, nfe_certificado_senha: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-border bg-background py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-foreground"
                            placeholder={fiscalMeta?.senha_certificado_configurada ? "Senha já cadastrada. Preencha apenas para trocar." : "Senha definida na exportação do PFX"}
                          />
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {fiscalMeta?.senha_certificado_configurada
                              ? "A senha atual permanece oculta e não volta mais para o navegador."
                              : "A senha do certificado será enviada apenas ao backend."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveFiscal}
                    disabled={fiscalSaving}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {fiscalSaving ? "Salvando..." : "Salvar Configurações Fiscais"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* WhatsApp Connection */}
          <WhatsAppConnection />

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
              <CreditCard className="h-5 w-5 text-primary" /> Plano e Assinatura
            </h3>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Status da Assinatura</span>
                    {empresa.subscription_status === "ACTIVE" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Ativa
                      </span>
                    ) : empresa.subscription_status === "OVERDUE" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <AlertCircle className="mr-1 h-3 w-3" /> Pagamento Pendente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                        <AlertCircle className="mr-1 h-3 w-3" /> Inativa
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-foreground">Plano Pro Mensal</div>
                  <p className="text-xs text-muted-foreground mt-1">ID: {empresa.subscription_id || "N/A"}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-muted/10 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Próximo Vencimento</p>
                      <p className="text-sm font-semibold text-foreground">
                        {empresa.data_vencimento ? new Date(empresa.data_vencimento).toLocaleDateString("pt-BR") : "A confirmar"}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-muted/10 flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                      <p className="text-sm font-semibold text-foreground">PIX Recorrente</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-64 flex flex-col gap-3">
                <button
                  className="w-full py-2 px-4 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
                  onClick={() => window.open("https://www.asaas.com/customer/billing", "_blank")}
                >
                  Gerenciar no Asaas
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Você será redirecionado para o portal de faturamento seguro do Asaas.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <UserManagement />
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <TutorialSettingsSection />
          </div>
        </div>
      )}
      <FiscalGuide />
    </div>
  );
}
