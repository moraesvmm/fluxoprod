"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2, CreditCard, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { useEmpresa, useUpdateEmpresa } from "@/lib/hooks/use-empresas";
import { useToast, Toast } from "@/components/ui/toast";
import { TutorialSettingsSection } from "@/components/onboarding/TutorialSettingsSection";

export default function ConfiguracoesPage() {
  const { data: empresa, isLoading } = useEmpresa();
  const updateMutation = useUpdateEmpresa();
  const { toasts, success, error: toastError, removeToast } = useToast();

  const [formData, setFormData] = useState({
    razao_social: "",
    cnpj: "",
    porte: "",
    segmento: "",
  });

  // Sync state when data is loaded
  useEffect(() => {
    if (empresa) {
      setFormData({
        razao_social: empresa.razao_social || "",
        cnpj: empresa.cnpj || "",
        porte: empresa.porte || "",
        segmento: empresa.segmento || "",
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
    </div>
  );
}
