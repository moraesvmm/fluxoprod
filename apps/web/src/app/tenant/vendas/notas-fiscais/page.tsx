"use client";

import { useState, useEffect } from "react";
import { 
  FileText, ArrowDownRight, ArrowUpRight, Plus, Upload, 
  Settings, MoreVertical, Edit, Trash2, Search, Link as LinkIcon 
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { type NotaFiscal, type CanalVenda, fetchCanaisVenda, createCanalVenda, updateCanalVenda, deleteCanalVenda } from "@/lib/api";
import { useToast, Toast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/modules/base/StatusBadge";
import { KPICard } from "@/components/modules/base/KPICard";

export default function NotasFiscaisPage() {
  const [activeTab, setActiveTab] = useState("saidas");
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [canais, setCanais] = useState<CanalVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  // Modals state
  const [showCanalModal, setShowCanalModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteCanalId, setDeleteCanalId] = useState<string | null>(null);
  const [editCanal, setEditCanal] = useState<CanalVenda | null>(null);
  
  const [canalForm, setCanalForm] = useState({ nome: "", ativo: true });
  
  const supabase = createClient();
  const { toasts, removeToast, success, error: toastError } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notasData, canaisData] = await Promise.all([
        supabase.rpc('tenant_listar_notas_fiscais').then(res => res.data as NotaFiscal[] || []),
        fetchCanaisVenda()
      ]);
      setNotas(notasData);
      setCanais(canaisData);
    } catch (err) {
      toastError("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarCanal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editCanal) {
        await updateCanalVenda(editCanal.id, canalForm.nome, canalForm.ativo);
        success("Canal atualizado com sucesso!");
      } else {
        await createCanalVenda(canalForm.nome, canalForm.ativo);
        success("Canal criado com sucesso!");
      }
      setShowCanalModal(false);
      setEditCanal(null);
      setCanalForm({ nome: "", ativo: true });
      loadData();
    } catch (err: any) {
      toastError(err.message || "Erro ao salvar canal");
    }
  };

  const excluirCanal = async () => {
    if (!deleteCanalId) return;
    try {
      await deleteCanalVenda(deleteCanalId);
      success("Canal de venda excluído!");
      loadData();
    } catch (err: any) {
      toastError(err.message || "Erro ao excluir canal");
    } finally {
      setDeleteCanalId(null);
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const filterNotas = (tipo: 'entrada' | 'saida') => {
    return notas.filter(n => n.tipo === tipo && (
      (n.numero && n.numero.includes(busca)) ||
      (n.emitente_nome && n.emitente_nome.toLowerCase().includes(busca.toLowerCase())) ||
      (n.destinatario_nome && n.destinatario_nome.toLowerCase().includes(busca.toLowerCase()))
    ));
  };

  const nfsSaida = filterNotas('saida');
  const nfsEntrada = filterNotas('entrada');

  const totaisSaida = nfsSaida.reduce((acc, curr) => acc + curr.valor_total, 0);
  const totaisEntrada = nfsEntrada.reduce((acc, curr) => acc + curr.valor_total, 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}
      
      <ConfirmModal 
        isOpen={!!deleteCanalId} 
        onConfirm={excluirCanal} 
        onCancel={() => setDeleteCanalId(null)}
        title="Excluir Canal de Venda" 
        message="Tem certeza? Se houver vendas vinculadas, elas não serão perdidas, mas o canal deixará de estar disponível."
        confirmText="Excluir" cancelText="Cancelar" variant="danger" 
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Controle Documental</h2>
          <p className="text-muted-foreground mt-1">Gestão de NFs e Canais de Venda Integrados</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowUploadModal(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-card border border-border hover:bg-muted text-foreground h-10 px-4 py-2">
            <Upload className="mr-2 h-4 w-4" /> Importar XML
          </button>
          <button onClick={() => {
            setEditCanal(null);
            setCanalForm({ nome: "", ativo: true });
            setShowCanalModal(true);
          }} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" /> Novo Canal
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard 
          title="Total NFs Saída" 
          value={formatarValor(totaisSaida)} 
          icon={ArrowUpRight} 
          className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800"
        />
        <KPICard 
          title="Total NFs Entrada" 
          value={formatarValor(totaisEntrada)} 
          icon={ArrowDownRight}
        />
        <KPICard 
          title="Canais de Venda Ativos" 
          value={canais.filter(c => c.ativo).length.toString()} 
          icon={Settings}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex rounded-lg bg-muted p-1">
          <TabsTrigger value="saidas" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">NFs de Saída</TabsTrigger>
          <TabsTrigger value="entradas" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">NFs de Entrada</TabsTrigger>
          <TabsTrigger value="configuracoes" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Canais de Venda</TabsTrigger>
        </TabsList>

        {/* NFs Tab Content Template */}
        {['saidas', 'entradas'].map((tabValue) => {
          const isSaida = tabValue === 'saidas';
          const items = isSaida ? nfsSaida : nfsEntrada;
          
          return (
            <TabsContent key={tabValue} value={tabValue} className="mt-4">
              <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder={`Buscar por número ou ${isSaida ? 'destinatário' : 'emitente'}...`}
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      className="w-full bg-card border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>{isSaida ? 'Destinatário' : 'Emitente'}</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando documentos...</TableCell></TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <FileText className="w-12 h-12 mb-4 opacity-20" />
                            <p>Nenhum documento encontrado.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((nf) => (
                        <TableRow key={nf.id}>
                          <TableCell className="font-mono">{nf.numero || '-'}</TableCell>
                          <TableCell>{new Date(nf.data_emissao).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="font-medium text-foreground">
                            {isSaida ? nf.destinatario_nome : nf.emitente_nome}
                            {isSaida && nf.venda_id && (
                              <div className="flex items-center text-[10px] text-primary mt-1 gap-1 uppercase tracking-wider font-semibold">
                                <LinkIcon className="w-3 h-3" /> Vinculada à Venda
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatarValor(nf.valor_total)}</TableCell>
                          <TableCell>
                            <StatusBadge status={nf.status === 'ativa' ? 'success' : nf.status === 'cancelada' ? 'error' : 'warning'} label={nf.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" title="Ver XML">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          );
        })}

        <TabsContent value="configuracoes" className="mt-4">
          <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="text-lg font-semibold text-foreground">Gestão de Canais de Venda</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure os canais pelos quais sua empresa realiza vendas. Estes canais aparecerão no Checkout do PDV para categorizar a origem da venda.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Canal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando canais...</TableCell></TableRow>
                ) : canais.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum canal cadastrado.</TableCell></TableRow>
                ) : (
                  canais.map((canal) => (
                    <TableRow key={canal.id}>
                      <TableCell className="font-medium text-foreground">{canal.nome}</TableCell>
                      <TableCell>
                        <StatusBadge status={canal.ativo ? 'success' : 'default'} label={canal.ativo ? 'Ativo' : 'Inativo'} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(canal.criado_em).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditCanal(canal);
                              setCanalForm({ nome: canal.nome, ativo: canal.ativo });
                              setShowCanalModal(true);
                            }}
                            className="p-2 rounded-md hover:bg-muted text-amber-500 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteCanalId(canal.id)}
                            className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Novo/Editar Canal */}
      <Modal 
        isOpen={showCanalModal} 
        onClose={() => { setShowCanalModal(false); setEditCanal(null); }} 
        title={editCanal ? "Editar Canal de Venda" : "Novo Canal de Venda"}
      >
        <form onSubmit={handleSalvarCanal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nome do Canal *</label>
            <input 
              type="text" 
              required 
              value={canalForm.nome} 
              onChange={e => setCanalForm({...canalForm, nome: e.target.value})}
              placeholder="Ex: E-commerce, Loja Física, WhatsApp..."
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="ativo"
              checked={canalForm.ativo} 
              onChange={e => setCanalForm({...canalForm, ativo: e.target.checked})}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="ativo" className="text-sm font-medium text-foreground cursor-pointer">Canal Ativo</label>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-md text-sm font-medium hover:bg-primary/90">
              {editCanal ? "Salvar Alterações" : "Criar Canal"}
            </button>
            <button type="button" onClick={() => setShowCanalModal(false)} className="flex-1 bg-muted text-foreground py-2 rounded-md text-sm font-medium hover:bg-slate-200">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Importar XML */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Importar XML de Nota Fiscal">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/30">
            <Upload className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">Arraste e solte seus arquivos XML aqui</p>
            <p className="text-xs text-muted-foreground mb-4">Suporta notas de entrada (fornecedores)</p>
            <button className="bg-card border border-border text-foreground px-4 py-2 rounded-md text-sm hover:bg-muted font-medium transition-colors">
              Procurar Arquivo
            </button>
          </div>
          <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
              Nota: A funcionalidade de parser completo de XML para integração direta com estoque será liberada em breve. No momento os documentos serão apenas arquivados no repositório documental.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
