"use client";

import { useState } from "react";
import { ArrowDownToLine, History, Plus, ReceiptText, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toast, useToast } from "@/components/ui/toast";
import { useLocaisEstoque } from "@/lib/hooks/use-locais-estoque";
import {
  useEntradasEstoque,
  useMovimentacoesEstoque,
  useRegistrarEntradaEstoque,
} from "@/lib/hooks/use-movimentacoes-estoque";
import { useProdutos } from "@/lib/hooks/use-produtos";

interface ItemForm {
  produto_id: string;
  quantidade: string;
  custo_unitario: string;
  local_id: string;
  lote: string;
  data_validade: string;
}

const novoItem = (): ItemForm => ({
  produto_id: "",
  quantidade: "1",
  custo_unitario: "",
  local_id: "",
  lote: "",
  data_validade: "",
});

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

const formatarData = (valor: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));

interface MovimentacoesEstoqueManagerProps {
  produtoInicialId?: string;
}

export default function MovimentacoesEstoqueManager({ produtoInicialId }: MovimentacoesEstoqueManagerProps) {
  const [visualizacao, setVisualizacao] = useState<"entradas" | "movimentos">("entradas");
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoFiltro, setProdutoFiltro] = useState(produtoInicialId || "");
  const [form, setForm] = useState({
    fornecedor_nome: "",
    fornecedor_documento: "",
    numero_documento: "",
    serie_documento: "",
    chave_nfe: "",
    data_emissao: "",
    observacao: "",
  });
  const [itens, setItens] = useState<ItemForm[]>([novoItem()]);

  const { data: produtos = [] } = useProdutos();
  const { data: locais = [] } = useLocaisEstoque();
  const { data: entradas = [], isLoading: carregandoEntradas } = useEntradasEstoque(produtoFiltro || undefined);
  const { data: movimentos = [], isLoading: carregandoMovimentos } = useMovimentacoesEstoque(produtoFiltro || undefined);
  const registrarMutation = useRegistrarEntradaEstoque();
  const { toasts, removeToast, success, error } = useToast();

  const limparFormulario = () => {
    setForm({
      fornecedor_nome: "",
      fornecedor_documento: "",
      numero_documento: "",
      serie_documento: "",
      chave_nfe: "",
      data_emissao: "",
      observacao: "",
    });
    setItens([novoItem()]);
  };

  const atualizarItem = (index: number, campo: keyof ItemForm, valor: string) => {
    setItens((atuais) => atuais.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [campo]: valor } : item
    ));
  };

  const handleRegistrar = async (event: React.FormEvent) => {
    event.preventDefault();

    if (itens.some((item) => !item.produto_id || Number(item.quantidade) <= 0)) {
      error("Selecione o produto e informe uma quantidade positiva em todos os itens.");
      return;
    }

    try {
      const resultado = await registrarMutation.mutateAsync({
        ...form,
        origem: "manual",
        idempotency_key: crypto.randomUUID(),
        itens: itens.map((item) => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          custo_unitario: Number(item.custo_unitario) || 0,
          local_id: item.local_id || undefined,
          lote: item.lote || undefined,
          data_validade: item.data_validade || undefined,
        })),
      });

      success(resultado.duplicada ? "Esta entrada já estava registrada." : "Entrada registrada e saldo atualizado.");
      setModalAberto(false);
      limparFormulario();
    } catch (exception) {
      error(exception instanceof Error ? exception.message : "Não foi possível registrar a entrada.");
    }
  };

  const carregando = visualizacao === "entradas" ? carregandoEntradas : carregandoMovimentos;

  const abrirEntrada = () => {
    setItens([{ ...novoItem(), produto_id: produtoFiltro }]);
    setModalAberto(true);
  };

  return (
    <div className="space-y-4">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Entradas e movimentações</h3>
          <p className="text-sm text-muted-foreground">Rastreabilidade por documento, produto e saldo.</p>
        </div>
        <button
          type="button"
          onClick={abrirEntrada}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ArrowDownToLine className="h-4 w-4" /> Registrar entrada
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-md bg-muted p-1">
          <button
            type="button"
            onClick={() => setVisualizacao("entradas")}
            className={`inline-flex h-8 items-center gap-2 rounded px-3 text-sm font-medium ${visualizacao === "entradas" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <ReceiptText className="h-4 w-4" /> Entradas
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao("movimentos")}
            className={`inline-flex h-8 items-center gap-2 rounded px-3 text-sm font-medium ${visualizacao === "movimentos" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <History className="h-4 w-4" /> Movimentos
          </button>
        </div>

        <select
          value={produtoFiltro}
          onChange={(event) => setProdutoFiltro(event.target.value)}
          className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm sm:w-64"
          aria-label="Filtrar histórico por produto"
        >
          <option value="">Todos os produtos</option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>{produto.nome}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {carregando ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando histórico...</div>
        ) : visualizacao === "entradas" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entrada</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Itens</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entradas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhuma entrada registrada.</TableCell></TableRow>
              ) : entradas.map((entrada) => (
                <TableRow key={entrada.id}>
                  <TableCell>
                    <div className="font-medium">{formatarData(entrada.data_entrada)}</div>
                    <div className="text-xs text-muted-foreground capitalize">{entrada.origem.replaceAll("_", " ")}</div>
                  </TableCell>
                  <TableCell>
                    <div>{entrada.fornecedor_nome || "Não informado"}</div>
                    {entrada.fornecedor_documento && <div className="text-xs text-muted-foreground">{entrada.fornecedor_documento}</div>}
                  </TableCell>
                  <TableCell className="max-w-52 break-all font-mono text-xs">
                    {entrada.chave_nfe || [entrada.numero_documento, entrada.serie_documento].filter(Boolean).join(" / ") || "Manual"}
                  </TableCell>
                  <TableCell className="text-right">{entrada.quantidade_itens}</TableCell>
                  <TableCell className="text-right font-medium">{formatarMoeda(entrada.valor_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhuma movimentação registrada.</TableCell></TableRow>
              ) : movimentos.map((movimento) => (
                <TableRow key={movimento.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatarData(movimento.criado_em)}</TableCell>
                  <TableCell className="font-medium">{movimento.produto_nome}</TableCell>
                  <TableCell className="capitalize">{movimento.tipo.replaceAll("_", " ")}</TableCell>
                  <TableCell className="max-w-44 break-all font-mono text-xs">{movimento.documento || "-"}</TableCell>
                  <TableCell className={`text-right font-semibold ${movimento.quantidade > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {movimento.quantidade > 0 ? "+" : ""}{movimento.quantidade}
                  </TableCell>
                  <TableCell className="text-right">{movimento.saldo_anterior} → {movimento.saldo_posterior}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal isOpen={modalAberto} onClose={() => setModalAberto(false)} title="Registrar entrada de estoque">
        <form onSubmit={handleRegistrar} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Fornecedor</label>
              <input
                value={form.fornecedor_nome}
                onChange={(event) => setForm({ ...form, fornecedor_nome: event.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Razão social ou nome"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">CNPJ/CPF</label>
              <input
                value={form.fornecedor_documento}
                onChange={(event) => setForm({ ...form, fornecedor_documento: event.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Documento"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Emissão</label>
              <input
                type="date"
                value={form.data_emissao}
                onChange={(event) => setForm({ ...form, data_emissao: event.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Número da NF</label>
              <input
                value={form.numero_documento}
                onChange={(event) => setForm({ ...form, numero_documento: event.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Série</label>
              <input
                value={form.serie_documento}
                onChange={(event) => setForm({ ...form, serie_documento: event.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Chave NF-e</label>
              <input
                value={form.chave_nfe}
                maxLength={44}
                inputMode="numeric"
                onChange={(event) => setForm({ ...form, chave_nfe: event.target.value.replace(/\D/g, "") })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
                placeholder="44 dígitos"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Itens recebidos</h4>
              <button
                type="button"
                onClick={() => setItens((atuais) => [...atuais, novoItem()])}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar item
              </button>
            </div>

            {itens.map((item, index) => (
              <div key={index} className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <select
                    required
                    value={item.produto_id}
                    onChange={(event) => atualizarItem(index, "produto_id", event.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    <option value="">Selecione o produto</option>
                    {produtos.map((produto) => (
                      <option key={produto.id} value={produto.id}>{produto.nome}</option>
                    ))}
                  </select>
                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItens((atuais) => atuais.filter((_, itemIndex) => itemIndex !== index))}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      title="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <input
                    required
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(event) => atualizarItem(index, "quantidade", event.target.value)}
                    className="min-w-0 rounded-md border border-border bg-background px-2 py-2 text-sm"
                    placeholder="Quantidade"
                    aria-label="Quantidade"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.custo_unitario}
                    onChange={(event) => atualizarItem(index, "custo_unitario", event.target.value)}
                    className="min-w-0 rounded-md border border-border bg-background px-2 py-2 text-sm"
                    placeholder="Custo unitário"
                    aria-label="Custo unitário"
                  />
                  <select
                    value={item.local_id}
                    onChange={(event) => atualizarItem(index, "local_id", event.target.value)}
                    className="col-span-2 min-w-0 rounded-md border border-border bg-background px-2 py-2 text-sm sm:col-span-1"
                    aria-label="Local de estoque"
                  >
                    <option value="">Sem local</option>
                    {locais.map((local) => (
                      <option key={local.id} value={local.id}>{local.nome}</option>
                    ))}
                  </select>
                  <input
                    value={item.lote}
                    onChange={(event) => atualizarItem(index, "lote", event.target.value)}
                    className="min-w-0 rounded-md border border-border bg-background px-2 py-2 text-sm"
                    placeholder="Lote"
                    aria-label="Lote"
                  />
                  <input
                    type="date"
                    value={item.data_validade}
                    onChange={(event) => atualizarItem(index, "data_validade", event.target.value)}
                    className="min-w-0 rounded-md border border-border bg-background px-2 py-2 text-sm"
                    aria-label="Data de validade"
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Observação</label>
            <textarea
              value={form.observacao}
              onChange={(event) => setForm({ ...form, observacao: event.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <div className="flex gap-3 border-t border-border pt-4">
            <button
              type="submit"
              disabled={registrarMutation.isPending}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {registrarMutation.isPending ? "Registrando..." : "Confirmar entrada"}
            </button>
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
