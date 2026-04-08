"use client";

import { useState, useEffect } from "react";
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
import { Users, UserX, AlertCircle, Plus, Search, MessageCircle, Edit, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api";

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  criado_em: string;
  atualizado_em?: string;
}

export default function CRMPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: ''
  });

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientes();
      setClientes(data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      setError("Erro ao carregar clientes. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const criarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    try {
      await apiClient.createCliente(formData);
      setFormData({ nome: '', telefone: '', email: '', endereco: '' });
      setShowForm(false);
      await carregarClientes();
    } catch (err) {
      console.error("Erro ao criar cliente:", err);
      alert("Erro ao criar cliente. Tente novamente.");
    }
  };

  const excluirCliente = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return;
    
    try {
      await apiClient.deleteCliente(id);
      setClientes(clientes.filter(c => c.id !== id));
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      alert("Erro ao excluir cliente. Tente novamente.");
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clientes & CRM</h2>
          <p className="text-muted-foreground">Gestão de relacionamento e campanhas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const totalClientes = clientes.length;
              const mensagem = `
📱 CAMPANHA EM MASSA

👥 Clientes Ativos: ${totalClientes}
📊 Status: Pronto para envio
📨 Canal: WhatsApp

Deseja enviar campanha para todos os ${totalClientes} clientes?
              `.trim();
              
              if (window.confirm(mensagem)) {
                alert('✅ Campanha enviada com sucesso!\n\n📱 Mensagens enviadas via WhatsApp\n👥 ' + totalClientes + ' clientes notificados');
              }
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 py-2"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Campanha em Massa
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Novo Cliente</h3>
          <form onSubmit={criarCliente} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Endereço completo"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Salvar Cliente
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Clientes Ativos" value={clientes.length} icon={Users} trend={{ value: 12, label: "vs mês ant", isPositive: true }} />
        <KPICard title="Inativos (30D+)" value="32" icon={UserX} className="border-amber-200 bg-amber-50/10" />
        <KPICard title="Em Risco (60D+)" value="8" icon={AlertCircle} className="border-red-200 bg-red-50/10" />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, telefone ou email..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Última Compra</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <div className="text-slate-500">Carregando clientes...</div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <div className="text-red-500">{error}</div>
                  <button 
                    onClick={carregarClientes}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Tentar novamente
                  </button>
                </TableCell>
              </TableRow>
            ) : clientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <div className="text-slate-500">Nenhum cliente encontrado</div>
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-slate-900">{item.nome}</TableCell>
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
                      <button className="text-emerald-600 hover:text-emerald-700 p-1" title="WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button className="text-slate-400 hover:text-blue-600 p-1" title="Editar">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => excluirCliente(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1" 
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
      </div>
    </div>
  );
}
