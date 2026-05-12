"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KPICard } from "@/components/modules/base/KPICard";
import { StatusBadge } from "@/components/modules/base/StatusBadge";
import { TableSkeleton } from "@/components/modules/base/TableSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserX, AlertCircle, Plus, Search, MessageCircle, Edit, Trash2, LayoutGrid, FileSpreadsheet } from "lucide-react";
import { useClientes, useCreateCliente, useDeleteCliente, useUpdateCliente } from "@/lib/hooks/use-clientes";
import { useToast, Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { sendEmail } from "@/lib/hooks/use-email";
import { enviarCampanhaMassa } from "@/lib/api";
import { type Cliente } from "@/lib/api";
import KanbanPipeline from "@/components/crm/kanban-pipeline";
import DashboardKPIs from "@/components/crm/dashboard-kpis";
import GerenciarTags from "@/components/crm/gerenciar-tags";
import TimelineInteracoes from "@/components/crm/timeline-interacoes";
import FiltroTags from '@/components/crm/filtro-tags';
import { NurturingPanel } from '@/components/crm/NurturingPanel';
import ImportadorClientesExcel from "@/components/crm/ImportadorClientesExcel";
import { Modal } from "@/components/ui/modal";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";

export default function CRMPage() {
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setBuscaDebounced(buscaCliente), 300);
    return () => clearTimeout(timer);
  }, [buscaCliente]);

  const { data: clientesResult, isLoading: loading, error: queryError } = useClientes({
    params: buscaDebounced ? { busca: buscaDebounced } : undefined,
  });
  const clientes = clientesResult?.data || [];
  const createMutation = useCreateCliente();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteCliente();
  const updateMutation = useUpdateCliente();
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCampanhaModal, setShowCampanhaModal] = useState(false);
  const [campanhaData, setCampanhaData] = useState({ titulo: '', mensagem: '', tipo: 'email' });
  const [campanhaEnviando, setCampanhaEnviando] = useState(false);
  const [viewMode, setViewMode] = useState<'lista' | 'pipeline'>('lista');
  const [formData, setFormData] = useState({ nome: '', telefone: '', email: '', endereco: '', cpf_cnpj: '' });
  const { toasts, removeToast, success, error: toastError, info } = useToast();

  const criarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;
    
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toastError("E-mail inválido. Verifique o formato.");
        return;
      }
    }
    
    try {
      await createMutation.mutateAsync(formData);
      
      if (formData.email) {
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Bem-vindo ao Fluxo!</h2>
              <p style="color: #666;">Olá, ${formData.nome}!</p>
              <p style="color: #666;">Obrigado por se cadastrar em nosso sistema. Estamos felizes em ter você como cliente.</p>
              <p style="color: #666;">Se precisar de qualquer ajuda, entre em contato conosco.</p>
              <p style="color: #666; margin-top: 20px;">Atenciosamente,<br>Equipe Fluxo</p>
            </div>
          `;
          await sendEmail({
            to: formData.email,
            subject: 'Bem-vindo ao Fluxo!',
            html: emailHtml
          });
        } catch (emailError) {
          console.error('Erro ao enviar e-mail de boas-vindas:', emailError);
        }
      }
      
      setFormData({ nome: '', telefone: '', email: '', endereco: '', cpf_cnpj: '' });
      setShowForm(false);
      success("Cliente criado com sucesso!");
    } catch {
      toastError("Erro ao criar cliente. Tente novamente.");
    }
  };

  const confirmExcluirCliente = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      success("Cliente excluído com sucesso!");
    } catch {
      toastError("Erro ao excluir cliente. Tente novamente.");
    } finally {
      setDeleteId(null);
    }
  };

  const abrirEdicao = (cliente: Cliente) => {
    setEditId(cliente.id);
    setFormData({
      nome: cliente.nome || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cpf_cnpj: cliente.cpf_cnpj || '',
    });
    setShowEditModal(true);
  };

  const editarCliente = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!editId || !formData.nome.trim()) return;

    try {
      await updateMutation.mutateAsync({ id: editId, cliente: formData });

      setFormData({ nome: '', telefone: '', email: '', endereco: '', cpf_cnpj: '' });
      setShowEditModal(false);
      setEditId(null);
      success("Cliente atualizado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao atualizar cliente: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const formatarData = (dataString: string) => new Date(dataString).toLocaleDateString('pt-BR');

  const recarregarClientes = () => {
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
  };

  const handleEnviarCampanha = async () => {
    if (!campanhaData.titulo.trim() || !campanhaData.mensagem.trim()) {
      toastError("Preencha o título e a mensagem da campanha");
      return;
    }

    if (clientes.length === 0) {
      toastError("Não há clientes para enviar a campanha");
      return;
    }

    setCampanhaEnviando(true);
    try {
      // Se tipo for WhatsApp, tentar envio direto via microserviço
      if (campanhaData.tipo === 'whatsapp') {
        const statusRes = await fetch('/api/whatsapp/status');
        const statusData = await statusRes.json();

        if (statusData.connected) {
          // Filtrar clientes com telefone cadastrado
          const clientesComTelefone = clientes.filter(c => c.telefone);
          if (clientesComTelefone.length === 0) {
            toastError("Nenhum cliente possui telefone cadastrado.");
            setCampanhaEnviando(false);
            return;
          }

          const messages = clientesComTelefone.map(c => ({
            to: c.telefone!.replace(/\D/g, ''),
            message: `*${campanhaData.titulo}*\n\n${campanhaData.mensagem}`,
          }));

          const res = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, delay_ms: 20000 }),
          });
          const resultado = await res.json();

          if (resultado.success) {
            success(`Campanha enviada via WhatsApp! ${resultado.enviados} de ${resultado.total} clientes notificados.`);
          } else {
            toastError(resultado.error || "Erro ao enviar campanha via WhatsApp.");
            setCampanhaEnviando(false);
            return;
          }
        } else {
          toastError("WhatsApp não está conectado. Conecte nas Configurações ou escolha outro canal.");
          setCampanhaEnviando(false);
          return;
        }
      } else {
        // Fallback: registrar via RPC (e-mail/sms)
        const clienteIds = clientes.map(c => c.id);
        const resultado = await enviarCampanhaMassa(
          clienteIds,
          campanhaData.titulo,
          campanhaData.mensagem,
          campanhaData.tipo
        );
        success(`Campanha registrada! ${resultado.enviados} de ${resultado.total} clientes notificados.`);
      }

      // Registrar no banco em ambos os casos
      const clienteIds = clientes.map(c => c.id);
      await enviarCampanhaMassa(clienteIds, campanhaData.titulo, campanhaData.mensagem, campanhaData.tipo).catch(() => {});

      setCampanhaData({ titulo: '', mensagem: '', tipo: 'email' });
      setShowCampanhaModal(false);
    } catch {
      toastError("Erro ao enviar campanha. Tente novamente.");
    } finally {
      setCampanhaEnviando(false);
    }
  };

  const error = queryError ? "Erro ao carregar clientes. Tente novamente." : null;

  return (
    <div className="space-y-8">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <ConfirmModal
        isOpen={!!deleteId}
        onConfirm={confirmExcluirCliente}
        onCancel={() => setDeleteId(null)}
        title="Excluir cliente"
        message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal de Campanha em Massa */}
      {showCampanhaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Campanha em Massa</h3>
              <p className="text-sm text-muted-foreground mt-1">Enviar mensagem para {clientes.length} clientes</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Tipo de Envio</label>
                <select
                  value={campanhaData.tipo}
                  onChange={(e) => setCampanhaData({ ...campanhaData, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                >
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Título *</label>
                <input
                  type="text"
                  value={campanhaData.titulo}
                  onChange={(e) => setCampanhaData({ ...campanhaData, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground placeholder:text-muted-foreground"
                  placeholder="Título da campanha"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Mensagem *</label>
                <textarea
                  value={campanhaData.mensagem}
                  onChange={(e) => setCampanhaData({ ...campanhaData, mensagem: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground placeholder:text-muted-foreground"
                  placeholder="Mensagem da campanha..."
                  rows={6}
                  required
                />
              </div>
              
              {/* Preview */}
              {campanhaData.titulo || campanhaData.mensagem ? (
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <h4 className="text-sm font-medium text-foreground/70 mb-2">Preview</h4>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    {campanhaData.titulo && (
                      <div className="font-semibold text-foreground mb-2">{campanhaData.titulo}</div>
                    )}
                    {campanhaData.mensagem && (
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{campanhaData.mensagem}</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            
            <div className="p-6 border-t border-border flex gap-2 justify-end">
              <button
                onClick={() => setShowCampanhaModal(false)}
                className="px-4 py-2 bg-muted text-foreground/80 rounded-md text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarCampanha}
                disabled={campanhaEnviando || !campanhaData.titulo.trim() || !campanhaData.mensagem.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {campanhaEnviando ? "Enviando..." : "Enviar Campanha"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {showImportModal && (
        <ImportadorClientesExcel 
          isOpen={showImportModal}
          onSuccess={() => {
            recarregarClientes();
            setShowImportModal(false);
          }} 
          onClose={() => setShowImportModal(false)} 
        />
      )}

      <div className="flex flex-col gap-8">
        {/* Painel de Inteligência e Reengajamento */}
        <div data-tour="crm-nurturing">
          <NurturingPanel />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Clientes & CRM</h2>
            <p className="text-muted-foreground">Gestão de relacionamento e campanhas.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCampanhaModal(true)}
              data-tour="crm-campanha"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 py-2"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Campanha em Massa
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-card border border-border text-foreground hover:bg-muted/50 h-10 px-4 py-2 shadow-sm"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
              Importar Excel
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              data-tour="crm-novo"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </button>
            <TutorialHelpButton moduleKey="crm" />
          </div>
        </div>

        <DashboardKPIs />

        {/* Toggle Lista/Pipeline */}
        <div className="flex items-center gap-2 border-b border-border">
          <button
            onClick={() => setViewMode('lista')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'lista'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setViewMode('pipeline')}
            data-tour="crm-funnel"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'pipeline'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4 inline mr-1" />
            Pipeline
          </button>
        </div>

        <Modal 
          isOpen={showForm} 
          onClose={() => setShowForm(false)} 
          title="Novo Cliente"
        >
          <form onSubmit={criarCliente} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Nome *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-muted/20 text-foreground" placeholder="Nome completo" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Telefone</label>
                  <input type="tel" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-muted/20 text-foreground" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">CPF/CNPJ</label>
                  <input type="text" value={formData.cpf_cnpj} onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-muted/20 text-foreground" placeholder="000.000.000-00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-muted/20 text-foreground" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Endereço</label>
                <input type="text" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-muted/20 text-foreground" placeholder="Endereço completo" />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-border mt-6">
              <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createMutation.isPending ? "Salvando..." : "Salvar Cliente"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-muted text-foreground/80 rounded-md text-sm font-medium hover:bg-muted/80 transition-colors border border-border">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal de Edição */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Editar Cliente"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-slate-50/50" placeholder="Nome completo" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <input type="tel" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-slate-50/50" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF/CNPJ</label>
                  <input type="text" value={formData.cpf_cnpj} onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-slate-50/50" placeholder="000.000.000-00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-slate-50/50" placeholder="email@exemplo.com" />
              </div>
            </div>
            
            {editId && (
              <>
                <div className="border-t border-border pt-4">
                  <GerenciarTags 
                    clienteId={editId} 
                    tagsAtuais={clientes.find(c => c.id === editId)?.tags || []}
                    onChange={() => {}}
                    onRefresh={recarregarClientes}
                  />
                </div>
                
                <div className="border-t border-border pt-4">
                  <TimelineInteracoes clienteId={editId} />
                </div>
              </>
            )}
          </div>
          
          <div className="flex gap-2 pt-4 border-t border-border mt-6">
            <button 
              type="button"
              onClick={editarCliente}
              disabled={updateMutation.isPending} 
              className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? "Salvando..." : "Atualizar Cliente"}
            </button>
            <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-muted text-foreground/80 rounded-md text-sm font-medium hover:bg-muted/80 transition-colors border border-border">
              Cancelar
            </button>
          </div>
        </Modal>

        {viewMode === 'pipeline' ? (
          <KanbanPipeline />
        ) : (
          <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar por nome, telefone ou email..."
                  value={buscaCliente}
                  onChange={e => setBuscaCliente(e.target.value)}
                  className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <FiltroTags onFiltroChange={(tags, operador) => console.log('Filtro:', tags, operador)} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <TableSkeleton rows={5} columns={6} />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <div className="text-red-500">{error}</div>
                    </TableCell>
                  </TableRow>
                ) : clientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <div className="text-slate-500">Nenhum cliente encontrado</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  clientes.map((item: Cliente) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">{item.nome}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.cpf_cnpj || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{item.telefone || '-'}</span>
                            <span className="text-xs text-muted-foreground">{item.email || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500">{formatarData(item.criado_em)}</TableCell>
                        <TableCell>
                          <StatusBadge status="success" label="ativo" className="capitalize" />
                        </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className={`p-1 ${item.telefone ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-300 opacity-50 cursor-not-allowed'}`}
                            title={item.telefone ? 'WhatsApp' : 'Telefone não cadastrado'}
                            disabled={!item.telefone}
                            onClick={() => {
                              if (!item.telefone) return;
                              const num = item.telefone.replace(/\D/g, '');
                              window.open(`https://wa.me/55${num}`, '_blank');
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button onClick={() => abrirEdicao(item)} className="text-slate-400 hover:text-blue-600 p-1" title="Editar">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteId(item.id)} className="text-slate-400 hover:text-red-600 p-1" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
