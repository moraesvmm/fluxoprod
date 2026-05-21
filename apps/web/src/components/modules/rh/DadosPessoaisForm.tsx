"use client";

import { useState, useEffect } from "react";
import { type DadosPessoais, type Funcionario } from "@/lib/api";
import { useAtualizarDadosPessoais } from "@/lib/hooks/use-documentos-rh";
import { Loader2, Save } from "lucide-react";

interface DadosPessoaisFormProps {
  funcionario: Funcionario;
  onToast: (message: string, type: "success" | "error") => void;
}


export function DadosPessoaisForm({ funcionario, onToast }: DadosPessoaisFormProps) {
  const [formData, setFormData] = useState<DadosPessoais>({});
  const atualizarDados = useAtualizarDadosPessoais();

  useEffect(() => {
    if (funcionario) {
      setFormData({
        cpf: funcionario.cpf || "",
        rg: funcionario.rg || "",
        data_nascimento: funcionario.data_nascimento || "",
        nome_mae: funcionario.nome_mae || "",
        endereco: funcionario.endereco || "",
        pis_pasep: funcionario.pis_pasep || "",
        ctps: funcionario.ctps || "",
        data_admissao: funcionario.data_admissao || "",
      });
    }
  }, [funcionario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await atualizarDados.mutateAsync({
        funcionarioId: funcionario.id,
        dados: formData,
      });
      onToast("Dados pessoais atualizados com sucesso!", "success");
    } catch (err: unknown) {
      onToast("Erro ao salvar: " + (err instanceof Error ? err.message : "Tente novamente."), "error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">CPF</label>
          <input
            type="text"
            value={formData.cpf || ""}
            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">RG</label>
          <input
            type="text"
            value={formData.rg || ""}
            onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="00.000.000-0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Data de Nascimento</label>
          <input
            type="date"
            value={formData.data_nascimento || ""}
            onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Data de Admissão</label>
          <input
            type="date"
            value={formData.data_admissao || ""}
            onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1">Nome da Mãe</label>
          <input
            type="text"
            value={formData.nome_mae || ""}
            onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Nome completo"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1">Endereço Completo</label>
          <input
            type="text"
            value={formData.endereco || ""}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Rua, número, bairro, cidade - UF"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">PIS/PASEP</label>
          <input
            type="text"
            value={formData.pis_pasep || ""}
            onChange={(e) => setFormData({ ...formData, pis_pasep: e.target.value })}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">CTPS</label>
          <input
            type="text"
            value={formData.ctps || ""}
            onChange={(e) => setFormData({ ...formData, ctps: e.target.value })}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={atualizarDados.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {atualizarDados.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {atualizarDados.isPending ? "Salvando..." : "Salvar Dados Pessoais"}
        </button>
      </div>
    </form>
  );
}
