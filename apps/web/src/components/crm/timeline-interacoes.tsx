"use client";

import { useState } from "react";
import { Phone, Mail, Users, FileText, MessageCircle, MapPin, Plus, Trash2, Clock, ChevronDown } from "lucide-react";
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
};

const TIPO_LABELS = {
  ligacao: "Ligação",
  email: "E-mail",
  reuniao: "Reunião",
  nota: "Nota",
  whatsapp: "WhatsApp",
  visita: "Visita",
};

const TIPO_CORES = {
  ligacao: "bg-blue-100 text-blue-600 border-blue-200",
  email: "bg-purple-100 text-purple-600 border-purple-200",
  reuniao: "bg-green-100 text-green-600 border-green-200",
  nota: "bg-yellow-100 text-yellow-600 border-yellow-200",
  whatsapp: "bg-emerald-100 text-emerald-600 border-emerald-200",
  visita: "bg-orange-100 text-orange-600 border-orange-200",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim()) return;

    try {
      await criar(formData);
      setFormData({
        cliente_id: clienteId,
        tipo: "nota",
        titulo: "",
        descricao: "",
        data_interacao: new Date().toISOString().slice(0, 16),
        duracao_minutos: undefined,
      });
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
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Interação
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="ligacao">Ligação</option>
                  <option value="email">E-mail</option>
                  <option value="reuniao">Reunião</option>
                  <option value="nota">Nota</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="visita">Visita</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input
                  type="datetime-local"
                  value={formData.data_interacao}
                  onChange={(e) => setFormData({ ...formData, data_interacao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Título da interação"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duração (minutos)</label>
                <input
                  type="number"
                  value={formData.duracao_minutos || ""}
                  onChange={(e) => setFormData({ ...formData, duracao_minutos: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ex: 30"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && interacoes.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Carregando interações...</div>
      ) : interacoes.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Nenhuma interação registrada</div>
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
                  <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-slate-200" />
                )}

                {/* Icon */}
                <div className={`absolute left-0 top-0 p-2 rounded-full border ${cor}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-500 uppercase">
                          {TIPO_LABELS[interacao.tipo]}
                        </span>
                        {interacao.duracao_minutos && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatarDuracao(interacao.duracao_minutos)}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-slate-900 mb-1">{interacao.titulo}</h4>
                      {interacao.descricao && (
                        <p className="text-sm text-slate-600 line-clamp-2">{interacao.descricao}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">{formatarData(interacao.data_interacao)}</p>
                    </div>
                    <button
                      onClick={() => excluir(interacao.id)}
                      disabled={isDeleting}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
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
