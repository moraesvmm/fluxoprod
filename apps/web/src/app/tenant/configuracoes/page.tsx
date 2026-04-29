"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2, CreditCard, Calendar, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { useEmpresa, useUpdateEmpresa } from "@/lib/hooks/use-empresas";
import { useToast, Toast } from "@/components/ui/toast";
import { TutorialSettingsSection } from "@/components/onboarding/TutorialSettingsSection";
import { FiscalGuide } from "@/components/modules/fiscal/FiscalGuide";

export default function ConfiguracoesPage() {
  const { data: empresa, isLoading } = useEmpresa();
  const updateMutation = useUpdateEmpresa();
  const { toasts, success, error: toastError, removeToast } = useToast();

  const [formData, setFormData] = useState({
    razao_social: "",
    cnpj: "",
    porte: "",
    segmento: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    regime_tributario: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
    focusnfe_token_producao: "",
    focusnfe_token_homologacao: "",
    nfe_ambiente: "homologacao" as 'producao' | 'homologacao',
    nfe_certificado_senha: "",
  });

  // Sync state when data is loaded
  useEffect(() => {
    if (empresa) {
      setFormData({
        razao_social: empresa.razao_social || "",
        cnpj: empresa.cnpj || "",
        porte: empresa.porte || "",
        segmento: empresa.segmento || "",
        inscricao_estadual: empresa.inscricao_estadual || "",
        inscricao_municipal: (empresa as any).inscricao_municipal || "",
        regime_tributario: empresa.regime_tributario || "",
        logradouro: (empresa as any).logradouro || "",
        numero: (empresa as any).numero || "",
        complemento: (empresa as any).complemento || "",
        bairro: (empresa as any).bairro || "",
        cidade: (empresa as any).cidade || "",
        uf: (empresa as any).uf || "",
        cep: (empresa as any).cep || "",
        focusnfe_token_producao: empresa.focusnfe_token_producao || "",
        focusnfe_token_homologacao: empresa.focusnfe_token_homologacao || "",
        nfe_ambiente: empresa.nfe_ambiente || "homologacao",
        nfe_certificado_senha: (empresa as any).nfe_certificado_senha || "",
      });
    }
  }, [empresa]);

  const handleSave = async () => {
    if (!empresa?.id) return;
    
    try {
      await updateMutation.mutateAsync({
        id: empresa.id,
        empresa: {
          razao_social: formData.razao_social,
          cnpj: formData.cnpj, // CNPJ could be editable or non-editable depending on requirements, let's keep editable for now since it's just config
          porte: formData.porte,
          segmento: formData.segmento,
          inscricao_estadual: formData.inscricao_estadual,
          inscricao_municipal: formData.inscricao_municipal,
          regime_tributario: formData.regime_tributario,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          uf: formData.uf,
          cep: formData.cep,
          focusnfe_token_producao: formData.focusnfe_token_producao,
          focusnfe_token_homologacao: formData.focusnfe_token_homologacao,
          nfe_ambiente: formData.nfe_ambiente,
          nfe_certificado_senha: formData.nfe_certificado_senha,
        }
      });
      success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toastError("Erro ao salvar configurações: " + err.message);
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
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Ajuste os parâmetros da sua empresa e integrações.</p>
      </div>
      
      {!empresa ? (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm text-center text-slate-500">
           Nenhuma empresa vinculada à sua conta foi encontrada.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5" /> Dados da Empresa
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Razão Social *</label>
                <input 
                  type="text" 
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700">CNPJ</label>
                <input 
                  type="text" 
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Porte</label>
                <select 
                  value={formData.porte}
                  onChange={(e) => setFormData({ ...formData, porte: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                >
                    <option value="">Selecione...</option>
                    <option value="micro">Microempresa</option>
                    <option value="pequeno">Pequeno Porte</option>
                    <option value="medio">Médio Porte</option>
                    <option value="grande">Grande Empresa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Segmento</label>
                <input 
                  type="text" 
                  value={formData.segmento}
                  onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                  placeholder="Ex: Varejo, Tecnologia..."
                />
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Endereço Fiscal</h4>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700">CEP</label>
                  <input 
                    type="text" 
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Logradouro (Rua/Av)</label>
                  <input 
                    type="text" 
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Número</label>
                  <input 
                    type="text" 
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Complemento</label>
                  <input 
                    type="text" 
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Bairro</label>
                  <input 
                    type="text" 
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Cidade</label>
                  <input 
                    type="text" 
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">UF</label>
                  <input 
                    type="text" 
                    maxLength={2}
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                    className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm uppercase" 
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
                   <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>
                 )}
              </button>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" /> Configurações Fiscais (NFe)
            </h3>
            <p className="text-sm text-slate-500 mb-6">Configure os parâmetros necessários para a emissão automática de notas fiscais eletrônicas.</p>

            {/* Guia de Onboarding Fiscal */}
            <div className="mb-8 p-4 rounded-lg bg-blue-50 border border-blue-100 flex gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900 mb-1">Iniciando com Notas Fiscais no Fluxo?</h4>
                <p className="text-xs text-blue-800 leading-relaxed mb-3">
                  Para que o Fluxo ERP emita notas automaticamente em seu nome, você precisará de dois itens essenciais que toda empresa organizada possui:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-white/50 p-2 rounded border border-blue-200">
                    <span className="font-bold text-blue-900 block mb-1">1. Certificado Digital A1 (.pfx)</span>
                    É a sua assinatura digital. Caso não possua, você pode adquirir em certificadoras como Serasa, Certisign ou Soluti.
                  </div>
                  <div className="bg-white/50 p-2 rounded border border-blue-200">
                    <span className="font-bold text-blue-900 block mb-1">2. Credenciamento na SEFAZ</span>
                    Solicite ao seu contador que realize o "Credenciamento para Emissão em Software Próprio" no portal da SEFAZ do seu estado.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Inscrição Estadual</label>
                <input 
                  type="text" 
                  value={formData.inscricao_estadual}
                  onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                  placeholder="Isento se não possuir"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Inscrição Municipal</label>
                <input 
                  type="text" 
                  value={formData.inscricao_municipal}
                  onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Regime Tributário</label>
                <select 
                  value={formData.regime_tributario}
                  onChange={(e) => setFormData({ ...formData, regime_tributario: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                >
                    <option value="">Selecione...</option>
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Simples Nacional - Excesso de limite">Simples Nacional - Excesso de limite</option>
                    <option value="Regime Normal">Regime Normal (Lucro Presumido/Real)</option>
                </select>
              </div>
              
              <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Integração FocusNFe</h4>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setFormData({ ...formData, nfe_ambiente: 'homologacao' })}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${formData.nfe_ambiente === 'homologacao' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                    >
                      Homologação
                    </button>
                    <button 
                      onClick={() => setFormData({ ...formData, nfe_ambiente: 'producao' })}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${formData.nfe_ambiente === 'producao' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                    >
                      Produção
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Token de Homologação (Testes)</label>
                    <input 
                      type="password" 
                      value={formData.focusnfe_token_homologacao}
                      onChange={(e) => setFormData({ ...formData, focusnfe_token_homologacao: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                      placeholder="Token do ambiente de testes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Token de Produção (Real)</label>
                    <input 
                      type="password" 
                      value={formData.focusnfe_token_producao}
                      onChange={(e) => setFormData({ ...formData, focusnfe_token_producao: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                      placeholder="Token do ambiente real"
                    />
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  * Os tokens são criptografados e usados apenas para comunicação com a SEFAZ via FocusNFe (Legado).
                </p>

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Emissão Nativa (Custo Zero)
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Certificado Digital (.pfx / .p12)</label>
                      <div className="mt-1 flex items-center gap-4">
                        <input 
                          type="file" 
                          accept=".pfx,.p12"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !empresa?.id) return;
                            
                            try {
                              const { error } = await createClient().storage
                                .from('fiscal')
                                .upload(`${empresa.id}/certificado.pfx`, file, { upsert: true });
                              
                              if (error) throw error;
                              success("Certificado enviado com sucesso!");
                            } catch (err: any) {
                              toastError("Erro ao enviar certificado: " + err.message);
                            }
                          }}
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">O arquivo será armazenado de forma segura no seu ambiente isolado.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Senha do Certificado</label>
                      <input 
                        type="password" 
                        value={formData.nfe_certificado_senha}
                        onChange={(e) => setFormData({ ...formData, nfe_certificado_senha: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" 
                        placeholder="Senha definida na exportação do PFX"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                 {updateMutation.isPending ? "Salvando..." : "Salvar Configurações Fiscais"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5" /> Plano e Assinatura
            </h3>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Status da Assinatura</span>
                    {empresa.subscription_status === 'ACTIVE' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Ativa
                      </span>
                    ) : empresa.subscription_status === 'OVERDUE' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertCircle className="mr-1 h-3 w-3" /> Pagamento Pendente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="mr-1 h-3 w-3" /> Inativa
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold">Plano Pro Mensal</div>
                  <p className="text-xs text-slate-400 mt-1">ID: {empresa.subscription_id || 'N/A'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-slate-100 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Próximo Vencimento</p>
                      <p className="text-sm font-semibold">
                        {empresa.data_vencimento ? new Date(empresa.data_vencimento).toLocaleDateString('pt-BR') : 'A confirmar'}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-100 flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Forma de Pagamento</p>
                      <p className="text-sm font-semibold">PIX Recorrente</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-64 flex flex-col gap-3">
                 <button 
                   className="w-full py-2 px-4 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
                   onClick={() => window.open(`https://www.asaas.com/customer/billing`, '_blank')}
                 >
                   Gerenciar no Asaas
                 </button>
                 <p className="text-[10px] text-center text-slate-400">
                   Você será redirecionado para o portal de faturamento seguro do Asaas.
                 </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <TutorialSettingsSection />
          </div>
        </div>
      )}
      <FiscalGuide />
    </div>
  );
}
