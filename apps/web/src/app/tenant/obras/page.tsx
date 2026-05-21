"use client";

import { useState } from "react";
import { KPICard } from "@/components/modules/base/KPICard";
import { StatusBadge } from "@/components/modules/base/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Plus, Search, Calendar, MapPin, Trash2, Edit, LayoutGrid, X } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/modules/base/Calendar";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast, Toast } from "@/components/ui/toast";
import { useObras, useCreateObra, useDeleteObra, useUpdateObra } from "@/lib/hooks/use-obras";
import { useClientes } from "@/lib/hooks/use-clientes";
import { useObraEtapas, useCreateObraEtapa, useUpdateObraEtapa, useDeleteObraEtapa, useObraProgresso } from "@/lib/hooks/use-obras-etapas";
import { useObraCustos, useCreateObraCusto, useUpdateObraCusto, useDeleteObraCusto, useObraResumoFinanceiro } from "@/lib/hooks/use-obras-custos";
import { useObraRecursos, useAlocarRecursoObra, useUpdateObraRecurso, useDeleteObraRecurso } from "@/lib/hooks/use-obras-recursos";
import { useObraDocumentos, useUploadObraDocumento, useDeleteObraDocumento } from "@/lib/hooks/use-obras-documentos";
import { EtapasTimeline } from "@/components/modules/obras/EtapasTimeline";
import { FinanceiroDashboard } from "@/components/modules/obras/FinanceiroDashboard";
import { RecursosTabela } from "@/components/modules/obras/RecursosTabela";
import { DocumentosGaleria } from "@/components/modules/obras/DocumentosGaleria";
import type { Obra, ObraUpdate, ObraEtapaCreate, ObraEtapaUpdate, ObraCusto, ObraCustoCreate, ObraCustoUpdate, ObraRecurso, ObraRecursoCreate, ObraRecursoUpdate, ObraDocumento } from "@/lib/api";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";

export default function ObrasPage() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [activeTab, setActiveTab] = useState<'detalhes' | 'etapas' | 'financeiro' | 'recursos' | 'documentos'>('detalhes');

  // Modais de custo e recurso
  const [showCustoModal, setShowCustoModal] = useState(false);
  const [custoForm, setCustoForm] = useState({ descricao: '', valor: '', tipo: 'previsto' as 'previsto' | 'realizado', data: new Date().toISOString().split('T')[0] });
  const [showRecursoModal, setShowRecursoModal] = useState(false);
  const [recursoForm, setRecursoForm] = useState({ nome: '', quantidade: '1', unidade: 'un' });

  const [formData, setFormData] = useState({
    nome: "",
    cliente_id: "",
    endereco: "",
    data_inicio: "",
    data_fim_prevista: "",
    orcamento: "",
    descricao: "",
    status: "planejada" as 'planejada' | 'andamento' | 'concluida' | 'suspensa',
  });

  const { toasts, removeToast, success, error: toastError } = useToast();

  const { data: obras, isLoading: loadingObras } = useObras();
  const { data: clientes, isLoading: loadingClientes } = useClientes();
  const createMutation = useCreateObra();
  const deleteMutation = useDeleteObra();
  const updateMutation = useUpdateObra();

  // Hooks para módulos da obra selecionada
  const { data: etapas } = useObraEtapas(selectedObra?.id || '');
  const { data: progresso } = useObraProgresso(selectedObra?.id || '');
  const createEtapaMutation = useCreateObraEtapa();
  const updateEtapaMutation = useUpdateObraEtapa();
  const deleteEtapaMutation = useDeleteObraEtapa();

  const { data: custos } = useObraCustos(selectedObra?.id || '');
  const { data: resumoFinanceiro } = useObraResumoFinanceiro(selectedObra?.id || '');
  const createCustoMutation = useCreateObraCusto();
  const updateCustoMutation = useUpdateObraCusto();
  const deleteCustoMutation = useDeleteObraCusto();

  const { data: recursos } = useObraRecursos(selectedObra?.id || '');
  const createRecursoMutation = useAlocarRecursoObra();
  const updateRecursoMutation = useUpdateObraRecurso();
  const deleteRecursoMutation = useDeleteObraRecurso();

  const { data: documentos } = useObraDocumentos(selectedObra?.id || '');
  const uploadDocumentoMutation = useUploadObraDocumento();
  const deleteDocumentoMutation = useDeleteObraDocumento();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;

    try {
      await createMutation.mutateAsync({
        nome: formData.nome,
        cliente_id: formData.cliente_id || undefined,
        endereco: formData.endereco,
        data_inicio: formData.data_inicio || undefined,
        data_fim_prevista: formData.data_fim_prevista || undefined,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : 0,
        descricao: formData.descricao,
        status: "planejada",
      });
      success("Obra criada com sucesso!");
      setShowModal(false);
      setFormData({
        nome: "",
        cliente_id: "",
        endereco: "",
        data_inicio: "",
        data_fim_prevista: "",
        orcamento: "",
        descricao: "",
        status: "planejada",
      });
    } catch (err: unknown) {
      toastError("Erro ao criar Obra: " + (err instanceof Error ? err.message : "Tente novamente"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      success("Obra excluída com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao excluir Obra: " + (err instanceof Error ? err.message : "Tente novamente"));
    } finally {
      setDeleteId(null);
    }
  };

  const formatarValor = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const formatarData = (dataString?: string) => {
    if (!dataString) return "—";
    return new Date(dataString).toLocaleDateString('pt-BR');
  };

  const transformarObrasParaCalendario = () => {
    return obras?.filter(obra => obra.data_inicio).map(obra => ({
      id: obra.id,
      title: obra.nome,
      date: obra.data_inicio!,
      endDate: obra.data_fim_prevista,
      status: obra.status,
      type: 'obra' as const,
      description: obra.endereco || obra.descricao,
    })) || [];
  };

  const formatarMoeda = (v?: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const abrirEdicao = (obra: Obra) => {
    setEditId(obra.id);
    setFormData({
      nome: obra.nome || '',
      cliente_id: obra.cliente_id || '',
      endereco: obra.endereco || '',
      data_inicio: obra.data_inicio || '',
      data_fim_prevista: obra.data_fim_prevista || '',
      orcamento: obra.orcamento ? String(obra.orcamento) : '',
      descricao: obra.descricao || '',
      status: (obra.status as 'planejada' | 'andamento' | 'concluida' | 'suspensa') || 'planejada',
    });
    setShowEditModal(true);
  };

  const selecionarObra = (obra: Obra) => {
    setSelectedObra(obra);
    setActiveTab('detalhes');
  };

  const fecharDetalhes = () => {
    setSelectedObra(null);
    setActiveTab('detalhes');
  };

  const editarObra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !formData.nome) return;

    try {
      const payload: ObraUpdate = {
        nome: formData.nome,
        cliente_id: formData.cliente_id || undefined,
        endereco: formData.endereco,
        data_inicio: formData.data_inicio || undefined,
        data_fim_prevista: formData.data_fim_prevista || undefined,
        orcamento_total: formData.orcamento ? parseFloat(formData.orcamento) : undefined,
        descricao: formData.descricao,
        status: formData.status,
      };

      await updateMutation.mutateAsync({ id: editId, obra: payload });

      if (selectedObra?.id === editId) {
        setSelectedObra({ ...selectedObra, ...payload });
      }

      setFormData({ nome: '', cliente_id: '', endereco: '', data_inicio: '', data_fim_prevista: '', orcamento: '', descricao: '', status: 'planejada' });
      setShowEditModal(false);
      setEditId(null);
      success("Obra atualizada com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao atualizar obra: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  // Handlers para etapas
  const handleCreateEtapa = async (etapa: ObraEtapaCreate) => {
    try {
      await createEtapaMutation.mutateAsync(etapa);
      success("Etapa criada com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao criar etapa: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const handleUpdateEtapa = async (etapa: ObraEtapaUpdate) => {
    if (!selectedObra || !etapa.id) return;
    try {
      await updateEtapaMutation.mutateAsync({ etapaId: etapa.id, etapa });
      success("Etapa atualizada com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao atualizar etapa: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const handleDeleteEtapa = async (etapaId: string) => {
    try {
      await deleteEtapaMutation.mutateAsync(etapaId);
      success("Etapa excluída com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao excluir etapa: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  // Handlers para custos
  const handleCreateCustoWrapper = () => {
    if (!selectedObra) return;
    setCustoForm({ descricao: '', valor: '', tipo: 'previsto', data: new Date().toISOString().split('T')[0] });
    setShowCustoModal(true);
  };

  const handleSubmitCusto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObra || !custoForm.descricao || !custoForm.valor) return;
    try {
      await createCustoMutation.mutateAsync({
        obra_id: selectedObra.id,
        categoria: custoForm.tipo || 'outro',
        descricao: custoForm.descricao,
        valor_previsto: parseFloat(custoForm.valor),
        tipo: custoForm.tipo === 'previsto' || custoForm.tipo === 'realizado' ? 'outro' : custoForm.tipo,
        data: custoForm.data || new Date().toISOString(),
      });
      success('Custo adicionado com sucesso!');
      setShowCustoModal(false);
    } catch (err: unknown) {
      toastError('Erro ao adicionar custo: ' + (err instanceof Error ? err.message : 'Tente novamente.'));
    }
  };

  const handleUpdateCustoWrapper = (custo: ObraCusto) => {
    // TODO: Open modal for updating custo
    toastError("Funcionalidade em desenvolvimento");
  };

  const handleDeleteCusto = async (custoId: string) => {
    try {
      await deleteCustoMutation.mutateAsync(custoId);
      success("Custo excluído com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao excluir custo: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const handleCreateRecursoWrapper = () => {
    if (!selectedObra) return;
    setRecursoForm({ nome: '', quantidade: '1', unidade: 'un' });
    setShowRecursoModal(true);
  };

  const handleSubmitRecurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObra || !recursoForm.nome) return;
    try {
      await createRecursoMutation.mutateAsync({
        obra_id: selectedObra.id,
        tipo: 'material',
        descricao: recursoForm.nome,
        quantidade: parseInt(recursoForm.quantidade, 10) || 1,
        unidade: recursoForm.unidade,
        custo_unitario: 0,
        status: 'alocado',
        data_alocacao: new Date().toISOString(),
      });
      success('Recurso alocado com sucesso!');
      setShowRecursoModal(false);
    } catch (err: unknown) {
      toastError('Erro ao alocar recurso: ' + (err instanceof Error ? err.message : 'Tente novamente.'));
    }
  };

  const handleUpdateRecursoWrapper = (recurso: ObraRecurso) => {
    // TODO: Open modal for updating recurso
    toastError("Funcionalidade em desenvolvimento");
  };

  const handleDeleteRecurso = async (recursoId: string) => {
    try {
      await deleteRecursoMutation.mutateAsync(recursoId);
      success("Recurso excluído com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao excluir recurso: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  // Handlers para documentos
  const handleUploadDocumento = async (file: File, descricao?: string) => {
    if (!selectedObra) return;
    try {
      await uploadDocumentoMutation.mutateAsync({ file, obraId: selectedObra.id, descricao });
      success("Documento enviado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao enviar documento: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const handleDeleteDocumento = async (documentoId: string) => {
    try {
      await deleteDocumentoMutation.mutateAsync(documentoId);
      success("Documento excluído com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao excluir documento: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const handleDownloadDocumento = (documento: ObraDocumento) => {
    window.open(documento.url, '_blank');
  };

  const planejadas = obras?.filter(o => o.status === "planejada").length || 0;
  const andamento = obras?.filter(o => o.status === "andamento").length || 0;
  const concluidas = obras?.filter(o => o.status === "concluida").length || 0;
  const investimentoTotal = obras?.reduce((acc, o) => acc + (o.orcamento || 0), 0) || 0;

  return (
    <div className="space-y-8">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <ConfirmModal
        isOpen={!!deleteId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        title="Excluir Obra"
        message="Tem certeza que deseja excluir esta Obra e todo o seu histórico?"
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal: Adicionar Custo */}
      {showCustoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card text-card-foreground rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Adicionar Custo</h3>
              <button onClick={() => setShowCustoModal(false)} className="text-slate-400 hover:text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmitCusto} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Descrição *</label>
                <input type="text" required value={custoForm.descricao}
                  onChange={e => setCustoForm({ ...custoForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Material de construção" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0" required value={custoForm.valor}
                    onChange={e => setCustoForm({ ...custoForm, valor: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Tipo *</label>
                  <select value={custoForm.tipo} onChange={e => setCustoForm({ ...custoForm, tipo: e.target.value as 'previsto' | 'realizado' })}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="previsto">Previsto</option>
                    <option value="realizado">Realizado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Data</label>
                <input type="date" value={custoForm.data}
                  onChange={e => setCustoForm({ ...custoForm, data: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={createCustoMutation.isPending}
                  className="flex-1 bg-primary text-white py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {createCustoMutation.isPending ? 'Salvando...' : 'Adicionar Custo'}
                </button>
                <button type="button" onClick={() => setShowCustoModal(false)}
                  className="flex-1 bg-muted text-foreground py-2 rounded-md text-sm font-medium hover:bg-slate-200">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Recurso */}
      {showRecursoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card text-card-foreground rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Alocar Recurso</h3>
              <button onClick={() => setShowRecursoModal(false)} className="text-slate-400 hover:text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmitRecurso} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome do Recurso *</label>
                <input type="text" required value={recursoForm.nome}
                  onChange={e => setRecursoForm({ ...recursoForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Peóes, Betoneira, Cimento" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Quantidade *</label>
                  <input type="number" min="1" required value={recursoForm.quantidade}
                    onChange={e => setRecursoForm({ ...recursoForm, quantidade: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Unidade</label>
                  <input type="text" value={recursoForm.unidade}
                    onChange={e => setRecursoForm({ ...recursoForm, unidade: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="un, h, kg, m²" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={createRecursoMutation.isPending}
                  className="flex-1 bg-primary text-white py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {createRecursoMutation.isPending ? 'Salvando...' : 'Alocar Recurso'}
                </button>
                <button type="button" onClick={() => setShowRecursoModal(false)}
                  className="flex-1 bg-muted text-foreground py-2 rounded-md text-sm font-medium hover:bg-slate-200">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Obras e Projetos</h2>
          <p className="text-muted-foreground">Gestão de obras com integração com OS e vendas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            data-tour="obras-nova"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Obra
          </button>
          <TutorialHelpButton moduleKey="obras" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Planejadas" value={planejadas} icon={Calendar} className="border-border bg-slate-50/10" />
        <KPICard title="Em Andamento" value={andamento} icon={Building2} className="border-blue-200 bg-blue-50/10" />
        <KPICard title="Concluídas" value={concluidas} icon={Building2} className="border-emerald-200 bg-emerald-50/10" />
        <div data-tour="obras-financeiro">
          <KPICard title="Investimento Total" value={formatarMoeda(investimentoTotal)} icon={Building2} />
        </div>
      </div>

      <div className="flex-1 rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, cliente ou endereço..."
              className="w-full bg-card text-card-foreground border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}
            data-tour="obras-cronograma"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card text-card-foreground border border-border rounded-md hover:bg-accent transition-colors"
          >
            {viewMode === 'table' ? (
              <>
                <Calendar className="h-4 w-4" />
                Calendário
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" />
                Tabela
              </>
            )}
          </button>
        </div>

        {viewMode === 'table' ? (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Obra</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim Previsto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Orçamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {loadingObras ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Carregando obras...
                </TableCell>
              </TableRow>
            ) : obras?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-10 w-10 text-slate-200" />
                    <p className="text-muted-foreground text-sm">Nenhuma obra encontrada</p>
                    <p className="text-slate-400 text-xs">Clique em &quot;Nova Obra&quot; para criar a primeira.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
                obras?.map((obra) => (
                  <TableRow 
                    key={obra.id} 
                    className={selectedObra?.id === obra.id ? "bg-blue-50" : "cursor-pointer hover:bg-accent"}
                    onClick={() => selecionarObra(obra)}
                  >
                    <TableCell className="font-medium text-foreground">{obra.nome}</TableCell>
                    <TableCell>{obra.cliente?.nome || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-muted-foreground text-sm">
                         <MapPin className="h-3 w-3 mr-1"/>
                         <span className="truncate max-w-[150px]">{obra.endereco || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatarData(obra.data_inicio)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatarData(obra.data_fim_prevista)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={obra.status === 'planejada' ? 'warning' : obra.status === 'concluida' ? 'success' : 'info'}
                        label={obra.status === 'planejada' ? 'Planejada' : obra.status === 'concluida' ? 'Concluída' : 'Em Andamento'}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-emerald-700">{formatarMoeda(obra.orcamento)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); abrirEdicao(obra); }} 
                          className="text-slate-400 hover:text-blue-600 p-1 transition-colors" 
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteId(obra.id); }} 
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors" 
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        ) : (
          <div className="p-4">
            <CalendarComponent
              events={transformarObrasParaCalendario()}
              title="Calendário de Obras"
              onEventClick={(event) => {
                // Abrir modal de edição quando clicar em um evento
                const obra = obras?.find(o => o.id === event.id);
                if (obra) abrirEdicao(obra);
              }}
            />
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Obra">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nome da Obra *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Reforma Residencial Silva"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Cliente</label>
            <select
               value={formData.cliente_id}
               onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
               className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {clientes?.data?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
            <input
               type="text"
               value={formData.endereco}
               onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
               className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
               placeholder="Ex: Rua A, 123 - Centro"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data Início</label>
              <input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data Fim Prevista</label>
              <input
                type="date"
                value={formData.data_fim_prevista}
                onChange={(e) => setFormData({ ...formData, data_fim_prevista: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Orçamento Total</label>
            <input
              type="number"
              step="0.01"
              value={formData.orcamento}
              onChange={(e) => setFormData({ ...formData, orcamento: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Descrição detalhada da obra..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
               type="submit"
               disabled={createMutation.isPending}
               className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "Salvando..." : "Criar Obra"}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 bg-muted text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Obra">
        <form onSubmit={editarObra} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nome da Obra *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Reforma Residencial Silva"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Cliente</label>
            <select
               value={formData.cliente_id}
               onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
               className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {clientes?.data?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
            <input
               type="text"
               value={formData.endereco}
               onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
               className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
               placeholder="Ex: Rua A, 123 - Centro"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data Início</label>
              <input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data Fim Prevista</label>
              <input
                type="date"
                value={formData.data_fim_prevista}
                onChange={(e) => setFormData({ ...formData, data_fim_prevista: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Orçamento Total</label>
            <input
              type="number"
              step="0.01"
              value={formData.orcamento}
              onChange={(e) => setFormData({ ...formData, orcamento: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Descrição detalhada da obra..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'planejada' | 'andamento' | 'concluida' | 'suspensa' })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="planejada">Planejada</option>
              <option value="andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="suspensa">Suspensa</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
               type="submit"
               disabled={updateMutation.isPending}
               className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? "Salvando..." : "Atualizar Obra"}
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 bg-muted text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Painel de Detalhes da Obra Selecionada */}
      {selectedObra && (
        <div className="fixed inset-y-0 right-0 w-96 bg-card text-card-foreground border-l border-border shadow-lg overflow-hidden z-50">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted">
              <h3 className="font-semibold text-lg">{selectedObra.nome}</h3>
              <button
                onClick={fecharDetalhes}
                className="p-1 hover:bg-slate-200 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
              <div className="p-4 border-b border-border">
                <TabsList className="w-full">
                  <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                  <TabsTrigger value="etapas">Etapas</TabsTrigger>
                  <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  <TabsTrigger value="recursos">Recursos</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="detalhes">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                      <p className="text-sm text-foreground">{selectedObra.nome}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Cliente</label>
                      <p className="text-sm text-foreground">{selectedObra.cliente?.nome || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
                      <p className="text-sm text-foreground">{selectedObra.endereco || '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Data Início</label>
                        <p className="text-sm text-foreground">{formatarData(selectedObra.data_inicio)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Data Fim Prevista</label>
                        <p className="text-sm text-foreground">{formatarData(selectedObra.data_fim_prevista)}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Orçamento</label>
                      <p className="text-sm text-foreground">{formatarMoeda(selectedObra.orcamento)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                      <StatusBadge
                        status={selectedObra.status === 'planejada' ? 'warning' : selectedObra.status === 'concluida' ? 'success' : 'info'}
                        label={selectedObra.status === 'planejada' ? 'Planejada' : selectedObra.status === 'concluida' ? 'Concluída' : selectedObra.status === 'andamento' ? 'Em Andamento' : 'Suspensa'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedObra.descricao || '—'}</p>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={() => abrirEdicao(selectedObra)}
                        className="w-full bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        Editar Obra
                      </button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="etapas">
                  {progresso && etapas && (
                    <EtapasTimeline
                      etapas={etapas}
                      progresso={progresso}
                      onEdit={handleUpdateEtapa}
                      onDelete={handleDeleteEtapa}
                    />
                  )}
                </TabsContent>

                <TabsContent value="financeiro">
                  {resumoFinanceiro && custos && (
                    <FinanceiroDashboard
                      resumo={resumoFinanceiro}
                      custos={custos}
                      onAdd={handleCreateCustoWrapper}
                      onEdit={handleUpdateCustoWrapper}
                      onDelete={handleDeleteCusto}
                    />
                  )}
                </TabsContent>

                <TabsContent value="recursos">
                  {recursos && (
                    <RecursosTabela
                      recursos={recursos}
                      onAdd={handleCreateRecursoWrapper}
                      onEdit={handleUpdateRecursoWrapper}
                      onDelete={handleDeleteRecurso}
                    />
                  )}
                </TabsContent>

                <TabsContent value="documentos">
                  {documentos && (
                    <DocumentosGaleria
                      documentos={documentos}
                      onUpload={handleUploadDocumento}
                      onDelete={handleDeleteDocumento}
                      onDownload={handleDownloadDocumento}
                    />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
