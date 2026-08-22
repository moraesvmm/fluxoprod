"use client";

import { useState } from "react";
import { Phone, Mail, Users, FileText, MessageCircle, MapPin, Plus, Trash2, Clock, ChevronDown, ShoppingBag } from "lucide-react";
import { useInteracoes } from "@/lib/hooks/use-interacoes";
import type { InteracaoClienteCreate } from "@/lib/api";

interface TimelineInteracoesProps {
  clienteId: string;
}

const TIPO_ICONS = {
  ligacao: Phone,
  email: Mail,
  reuniao: Users,
  nota: FileText,
  whatsapp: MessageCircle,
  visita: MapPin,
  venda: ShoppingBag,
};

const TIPO_LABELS = {
  ligacao: "Ligação",
  email: "E-mail",
  reuniao: "Reunião",
  nota: "Nota",
  whatsapp: "WhatsApp",
  visita: "Visita",
  venda: "Venda",
};

const TIPO_CORES = {
  ligacao: "bg-blue-100 text-blue-600 border-blue-200 dark:border-blue-500/20",
  email: "bg-purple-100 text-purple-600 border-purple-200",
  reuniao: "bg-green-100 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/20",
  nota: "bg-yellow-100 text-yellow-600 border-yellow-200",
  whatsapp: "bg-emerald-100 text-emerald-600 border-emerald-200",
  visita: "bg-orange-100 text-orange-600 border-orange-200",
  venda: "bg-teal-100 text-teal-600 border-teal-200",
};

export default function TimelineInteracoes({ clienteId }: TimelineInteracoesProps) {
  const { interacoes, loading, criar, excluir, carregarMais, hasMore, isCreating, isDeleting } = useInteracoes({ clienteId });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<InteracaoClienteCreate>({
    cliente_id: clienteId,
    tipo: "nota",
    titulo: "",
    descricao: "",
    data_interacao: new Date().toISOString().slice(0, 16),
    duracao_minutos: undefined,
  });

  const [vendaData, setVendaData] = useState<{
    produto_descricao: string;
    valor?: number;
    ciclo_recompra_dias?: number;
  }>({ produto_descricao: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() && formData.tipo !== 'venda') return;
    if (formData.tipo === 'venda' && !vendaData.produto_descricao.trim()) return;

    try {
      const finalTitulo = formData.tipo === 'venda' && !formData.titulo.trim() 
        ? `Venda: ${vendaData.produto_descricao}` 
        : formData.titulo;

      const finalMetadata = formData.tipo === 'venda' 
        ? { 
            produto_descricao: vendaData.produto_descricao,
            valor: vendaData.valor,
            ciclo_recompra_dias: vendaData.ciclo_recompra_dias
          } 
        : {};

      await criar({
        ...formData,
        titulo: finalTitulo,
        metadata: finalMetadata
      });

      setFormData({
        cliente_id: clienteId,
        tipo: "nota",
        titulo: "",
        descricao: "",
        data_interacao: new Date().toISOString().slice(0, 16),
        duracao_minutos: undefined,
      });
      setVendaData({ produto_descricao: '' });
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao criar interação:", error);
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarDuracao = (minutos?: number) => {
    if (!minutos) return null;
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Histórico de Interações</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Interação
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as InteracaoClienteCreate['tipo'] })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="ligacao">Ligação</option>
                  <option value="email">E-mail</option>
                  <option value="reuniao">Reunião</option>
                  <option value="nota">Nota</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="visita">Visita</option>
                  <option value="venda">Venda</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Data</label>
                <input
                  type="datetime-local"
                  value={formData.data_interacao}
                  onChange={(e) => setFormData({ ...formData, data_interacao: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{formData.tipo === 'venda' ? 'Título (opcional)' : 'Título *'}</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder={formData.tipo === 'venda' ? 'Auto-preenchido se vazio' : 'Título da interação'}
                  required={formData.tipo !== 'venda'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Duração (minutos)</label>
                <input
                  type="number"
                  value={formData.duracao_minutos || ""}
                  onChange={(e) => setFormData({ ...formData, duracao_minutos: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ex: 30"
                  min="0"
                />
              </div>
            </div>

            {formData.tipo === 'venda' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Produto / Serviço *</label>
                  <input
                    type="text"
                    value={vendaData.produto_descricao}
                    onChange={(e) => setVendaData({ ...vendaData, produto_descricao: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Suplemento Proteína"
                    required={formData.tipo === 'venda'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={vendaData.valor || ""}
                    onChange={(e) => setVendaData({ ...vendaData, valor: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Ciclo Recompra (dias)</label>
                  <input
                    type="number"
                    value={vendaData.ciclo_recompra_dias || ""}
                    onChange={(e) => setVendaData({ ...vendaData, ciclo_recompra_dias: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: 30"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Detalhes da interação..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="bg-violet-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {isCreating ? "Salvando..." : "Salvar Interação"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-muted text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && interacoes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Carregando interações...</div>
      ) : interacoes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhuma interação registrada</div>
      ) : (
        <div className="space-y-4">
          {interacoes.map((interacao, index) => {
            const Icon = TIPO_ICONS[interacao.tipo];
            const cor = TIPO_CORES[interacao.tipo];
            const isLast = index === interacoes.length - 1;

            return (
              <div key={interacao.id} className="relative pl-8">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-muted" />
                )}

                {/* Icon */}
                <div className={`absolute left-0 top-0 p-2 rounded-full border ${cor}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          {TIPO_LABELS[interacao.tipo]}
                        </span>
                        {interacao.duracao_minutos && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatarDuracao(interacao.duracao_minutos)}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-foreground mb-1">{interacao.titulo}</h4>
                      {interacao.tipo === 'venda' && interacao.metadata && (
                        <div className="mt-2 flex flex-wrap gap-2 mb-2">
                          {interacao.metadata.produto_descricao && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-200">
                              🛍️ {interacao.metadata.produto_descricao}
                            </span>
                          )}
                          {interacao.metadata.valor && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-500/20">
                              R$ {Number(interacao.metadata.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          {interacao.metadata.ciclo_recompra_dias && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 dark:text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-500/20">
                              🔄 {interacao.metadata.ciclo_recompra_dias} dias
                            </span>
                          )}
                        </div>
                      )}
                      {interacao.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{interacao.descricao}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{formatarData(interacao.data_interacao)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => excluir(interacao.id)}
                      disabled={isDeleting}
                      className="p-1 text-muted-foreground hover:text-red-600 dark:text-red-500 hover:bg-red-50 dark:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={carregarMais}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
                Carregar mais
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
