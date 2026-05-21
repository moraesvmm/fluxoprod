"use client";

import { useState } from "react";
import { useFichasTecnicas, useCreateFichaTecnica } from "@/lib/hooks/use-producao";
import { useProdutos } from "@/lib/hooks/use-produtos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Plus, PackageSearch } from "lucide-react";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";

export default function FichasTecnicasPage() {
  const { data: fichas, isLoading } = useFichasTecnicas();
  const { data: produtos } = useProdutos();
  const createFicha = useCreateFichaTecnica();
  const { error, success } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [produtoAcabadoId, setProdutoAcabadoId] = useState("");
  const [materiaPrimaId, setMateriaPrimaId] = useState("");
  const [quantidade, setQuantidade] = useState("");

  // Apenas produtos normais/acabados
  const produtosAcabados = produtos?.filter(p => p.tipo_item !== 'materia_prima' && p.tipo_item !== 'consumo');
  // Apenas matérias-primas ou itens usáveis como insumo
  const materiasPrimas = produtos?.filter(p => p.tipo_item === 'materia_prima' || p.tipo_item === 'embalagem' || p.tipo_item === 'consumo' || p.tipo_item === 'produto_acabado');

  const handleCreate = async () => {
    if (!produtoAcabadoId || !materiaPrimaId || !quantidade) {
      error("Preencha todos os campos");
      return;
    }
    try {
      await createFicha.mutateAsync({
        produto_acabado_id: produtoAcabadoId,
        materia_prima_id: materiaPrimaId,
        quantidade_necessaria: parseFloat(quantidade)
      });
      success("Ficha Técnica criada com sucesso");
      setIsModalOpen(false);
      setProdutoAcabadoId("");
      setMateriaPrimaId("");
      setQuantidade("");
    } catch (err: any) {
      error(`Erro ao criar ficha: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Fichas Técnicas (BOM)</h1>
          <p className="text-muted-foreground">Gerencie a composição de materiais dos seus produtos acabados.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsModalOpen(true)} data-tour="prod-nova-ficha">
            <Plus className="w-4 h-4 mr-2" />
            Nova Ficha
          </Button>
          <TutorialHelpButton moduleKey="producao" />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm" data-tour="prod-fichas">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto Acabado</TableHead>
              <TableHead>Materia Prima / Insumo</TableHead>
              <TableHead>Qtd Necessária</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : fichas?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <PackageSearch className="w-8 h-8 mb-2" />
                    <p>Nenhuma ficha técnica cadastrada</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              fichas?.map((ficha) => (
                <TableRow key={ficha.id}>
                  <TableCell className="font-medium">{ficha.produto_acabado_nome}</TableCell>
                  <TableCell>{ficha.materia_prima_nome}</TableCell>
                  <TableCell>{ficha.quantidade_necessaria}</TableCell>
                  <TableCell>{ficha.unidade_medida || 'UN'}</TableCell>
                  <TableCell>{new Date(ficha.criado_em).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Ficha Técnica">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Produto Acabado</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={produtoAcabadoId}
              onChange={(e) => setProdutoAcabadoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {produtosAcabados?.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Matéria Prima / Insumo</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={materiaPrimaId}
              onChange={(e) => setMateriaPrimaId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {materiasPrimas?.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} (Estoque: {p.estoque_atual})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Quantidade Necessária (por Unidade de Acabado)</label>
            <Input
              type="number"
              step="0.0001"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Ex: 0.150"
            />
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createFicha.isPending}>
              {createFicha.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
