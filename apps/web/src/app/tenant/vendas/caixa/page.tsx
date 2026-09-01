"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  LockKeyhole,
  Printer,
  ReceiptText,
  ShieldAlert,
  Store,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import {
  useAbrirCaixa,
  useContextosCaixa,
  useFecharCaixa,
  useReabrirCaixa,
  useRegistrarMovimentoCaixa,
  useResumoCaixa,
} from "@/lib/hooks/use-caixa";

type ModalAberto = "abrir" | "sangria" | "suprimento" | "fechar" | "reabrir" | null;

const FORMAS_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Credito",
  cartao_debito: "Debito",
  boleto: "Boleto",
  transferencia: "Transferencia",
};

function dataOperacionalAtual() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarHora(valor: string) {
  return new Date(valor).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function CaixaPage() {
  const { data: contextos = [], isLoading: carregandoContextos, error: erroContextos } = useContextosCaixa();
  const [contextoId, setContextoId] = useState("");
  const [dataOperacional, setDataOperacional] = useState(dataOperacionalAtual);
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  const [valorAbertura, setValorAbertura] = useState("0");
  const [valorMovimento, setValorMovimento] = useState("");
  const [motivoMovimento, setMotivoMovimento] = useState("");
  const [valoresContados, setValoresContados] = useState<Record<string, string>>({});
  const [observacaoFechamento, setObservacaoFechamento] = useState("");
  const [motivoReabertura, setMotivoReabertura] = useState("");
  const abrirMutation = useAbrirCaixa();
  const movimentoMutation = useRegistrarMovimentoCaixa();
  const fecharMutation = useFecharCaixa();
  const reabrirMutation = useReabrirCaixa();
  const { toasts, removeToast, success, error: toastError } = useToast();

  useEffect(() => {
    if (!contextoId && contextos[0]) {
      setContextoId(`${contextos[0].filial_id}:${contextos[0].caixa_id}`);
    }
  }, [contextoId, contextos]);

  const contexto = contextos.find(
    (item) => `${item.filial_id}:${item.caixa_id}` === contextoId
  );
  const { data: resumo, isLoading: carregandoResumo, error: erroResumo } = useResumoCaixa(
    contexto?.filial_id,
    contexto?.caixa_id,
    dataOperacional
  );

  useEffect(() => {
    if (resumo?.status === "aberto" || resumo?.status === "reaberto") {
      const valores = Object.fromEntries(
        Object.entries(resumo.formas).map(([forma, valor]) => [forma, String(valor)])
      );
      setValoresContados(valores);
    }
  }, [resumo?.sessao_id, resumo?.status]);

  const formas = Array.from(new Set([...Object.keys(resumo?.formas ?? {}), ...Object.keys(valoresContados)])).sort();
  const totalInformado = Object.values(valoresContados).reduce((total, valor) => total + (Number(valor) || 0), 0);
  const diferenca = totalInformado - (resumo?.valor_esperado ?? 0);
  const caixaAberto = resumo?.status === "aberto" || resumo?.status === "reaberto";
  const fechando = fecharMutation.isPending;

  const fecharModal = () => {
    if (fechando) return;
    setModalAberto(null);
  };

  const abrirCaixa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contexto) return;
    try {
      await abrirMutation.mutateAsync({
        filialId: contexto.filial_id,
        caixaId: contexto.caixa_id,
        valorAbertura: Number(valorAbertura) || 0,
      });
      success("Caixa aberto. O circuito financeiro ja esta sendo acompanhado.");
      setModalAberto(null);
    } catch (error: unknown) {
      toastError(error instanceof Error ? error.message : "Nao foi possivel abrir o caixa.");
    }
  };

  const registrarMovimento = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contexto || !modalAberto) return;
    const tipo = modalAberto === "sangria" ? "saida" : "suprimento";
    try {
      await movimentoMutation.mutateAsync({
        filialId: contexto.filial_id,
        caixaId: contexto.caixa_id,
        tipo,
        valor: Number(valorMovimento),
        formaPagamento: "dinheiro",
        motivo: motivoMovimento.trim(),
      });
      success(tipo === "saida" ? "Sangria registrada." : "Suprimento registrado.");
      setValorMovimento("");
      setMotivoMovimento("");
      setModalAberto(null);
    } catch (error: unknown) {
      toastError(error instanceof Error ? error.message : "Nao foi possivel registrar o movimento.");
    }
  };

  const fecharCaixa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contexto || !resumo) return;
    if (diferenca !== 0 && !observacaoFechamento.trim()) {
      toastError("Explique a diferenca antes de fechar o caixa.");
      return;
    }
    try {
      const resposta = await fecharMutation.mutateAsync({
        filialId: contexto.filial_id,
        caixaId: contexto.caixa_id,
        data: resumo.data_operacional,
        valoresContados: Object.fromEntries(
          Object.entries(valoresContados).map(([forma, valor]) => [forma, Number(valor) || 0])
        ),
        observacao: observacaoFechamento.trim() || undefined,
      });
      success(`Caixa fechado com diferenca de ${formatarMoeda(resposta.diferenca)}.`);
      setModalAberto(null);
    } catch (error: unknown) {
      toastError(error instanceof Error ? error.message : "Nao foi possivel fechar o caixa.");
    }
  };

  const reabrirCaixa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resumo?.fechamento_id || !motivoReabertura.trim()) return;
    try {
      await reabrirMutation.mutateAsync({ fechamentoId: resumo.fechamento_id, motivo: motivoReabertura.trim() });
      success("Caixa reaberto. Novos movimentos ficarao registrados na trilha de auditoria.");
      setMotivoReabertura("");
      setModalAberto(null);
    } catch (error: unknown) {
      toastError(error instanceof Error ? error.message : "Nao foi possivel reabrir o caixa.");
    }
  };

  if (carregandoContextos) {
    return <div className="py-12 text-sm text-muted-foreground">Carregando caixas autorizados...</div>;
  }

  if (erroContextos || contextos.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-600" />
        <h2 className="text-xl font-semibold">Nenhum caixa disponivel</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Voce nao possui um caixa autorizado nesta empresa. Solicite ao gestor da filial a configuracao do seu acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/tenant/vendas" className="text-sm text-muted-foreground hover:text-foreground">Vendas</Link>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Caixa da filial</h2>
          <p className="mt-1 text-sm text-muted-foreground">Conferencia do circuito financeiro e fechamento diario.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dataOperacional}
              max={dataOperacionalAtual()}
              onChange={(event) => setDataOperacional(event.target.value)}
              className="bg-transparent outline-none"
              aria-label="Data operacional"
            />
          </label>
          {contextos.length > 1 && (
            <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <select value={contextoId} onChange={(event) => setContextoId(event.target.value)} className="min-w-44 bg-transparent outline-none">
                {contextos.map((item) => (
                  <option key={`${item.filial_id}:${item.caixa_id}`} value={`${item.filial_id}:${item.caixa_id}`}>
                    {item.filial_nome} - {item.caixa_nome}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {contexto && (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{contexto.filial_nome}</p>
                  <p className="text-sm text-muted-foreground">{contexto.caixa_nome} - perfil {contexto.papel}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${caixaAberto ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                {caixaAberto ? <CheckCircle2 className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                {caixaAberto ? "Caixa aberto" : resumo?.status === "fechado" ? "Caixa fechado" : "Caixa nao aberto"}
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Fundo de troco</p>
                <p className="mt-1 text-xl font-semibold">{formatarMoeda(resumo?.valor_abertura ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Saldo esperado</p>
                <p className="mt-1 text-xl font-semibold">{formatarMoeda(resumo?.valor_esperado ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Movimentos</p>
                <p className="mt-1 text-xl font-semibold">{resumo?.movimentos.length ?? 0}</p>
              </div>
            </div>
          </section>

          <section className="border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold">Acoes do caixa</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {resumo?.status === "nao_aberto" ? (
                <Button className="col-span-2" onClick={() => setModalAberto("abrir")}>
                  <CircleDollarSign data-icon="inline-start" /> Abrir caixa
                </Button>
              ) : (
                <>
                  <Button variant="outline" disabled={!caixaAberto} onClick={() => setModalAberto("sangria")}>
                    <ArrowUpFromLine data-icon="inline-start" /> Sangria
                  </Button>
                  <Button variant="outline" disabled={!caixaAberto} onClick={() => setModalAberto("suprimento")}>
                    <ArrowDownToLine data-icon="inline-start" /> Suprimento
                  </Button>
                  <Button className="col-span-2" disabled={!caixaAberto} onClick={() => setModalAberto("fechar")}>
                    <LockKeyhole data-icon="inline-start" /> Conferir e fechar
                  </Button>
                </>
              )}
              {resumo?.status === "fechado" && (
                <>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer data-icon="inline-start" /> Imprimir comprovante
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!resumo.fechamento_id || !["supervisor", "gerente"].includes(contexto.papel)}
                    onClick={() => setModalAberto("reabrir")}
                  >
                    <LockKeyhole data-icon="inline-start" /> Reabrir caixa
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {erroResumo ? (
        <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Nao foi possivel carregar o resumo do caixa.</div>
      ) : carregandoResumo ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Atualizando circuito financeiro...</div>
      ) : (
        <>
          <section className="border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-semibold">Conferencia por forma de pagamento</h3>
                <p className="text-sm text-muted-foreground">Valores calculados pelo livro de movimentos da filial.</p>
              </div>
              <WalletCards className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              {(formas.length ? formas : ["dinheiro", "pix", "cartao_credito", "cartao_debito"]).map((forma) => (
                <div key={forma} className="p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{FORMAS_LABEL[forma] ?? forma}</p>
                  <p className="mt-2 text-lg font-semibold">{formatarMoeda(resumo?.formas[forma] ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">Saldo esperado</p>
                  <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><dt>Entradas</dt><dd className="text-emerald-700 dark:text-emerald-400">{formatarMoeda(resumo?.circuito_por_forma[forma]?.entradas ?? 0)}</dd></div>
                    <div className="flex justify-between"><dt>Estornos</dt><dd className="text-rose-600">{formatarMoeda(resumo?.circuito_por_forma[forma]?.estornos ?? 0)}</dd></div>
                    <div className="flex justify-between"><dt>Saidas</dt><dd className="text-rose-600">{formatarMoeda(resumo?.circuito_por_forma[forma]?.saidas ?? 0)}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-semibold">Circuito financeiro do dia</h3>
                <p className="text-sm text-muted-foreground">Entradas, estornos, sangrias, suprimentos e ajustes registrados neste caixa.</p>
              </div>
              <ReceiptText className="h-5 w-5 text-muted-foreground" />
            </div>
            {!resumo?.movimentos.length ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Nenhum movimento registrado nesta data.</div>
            ) : (
              <div className="divide-y divide-border">
                {resumo.movimentos.map((movimento) => {
                  const saida = movimento.tipo === "saida" || movimento.tipo === "estorno";
                  return (
                    <div key={movimento.id} className="grid gap-2 px-5 py-3 text-sm sm:grid-cols-[72px_1fr_auto] sm:items-center">
                      <span className="text-muted-foreground">{formatarHora(movimento.criado_em)}</span>
                      <div>
                        <p className="font-medium">{movimento.descricao}</p>
                        <p className="text-xs capitalize text-muted-foreground">{FORMAS_LABEL[movimento.forma_pagamento] ?? movimento.forma_pagamento} - {movimento.origem_tipo}</p>
                      </div>
                      <span className={saida ? "font-semibold text-rose-600" : "font-semibold text-emerald-700 dark:text-emerald-400"}>
                        {saida ? "-" : "+"}{formatarMoeda(movimento.valor)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <Modal isOpen={modalAberto === "abrir"} onClose={fecharModal} title="Abrir caixa">
        <form className="space-y-4" onSubmit={abrirCaixa}>
          <p className="text-sm text-muted-foreground">Informe o fundo de troco inicial do caixa selecionado.</p>
          <label className="block text-sm font-medium">Valor de abertura
            <input type="number" min="0" step="0.01" value={valorAbertura} onChange={(event) => setValorAbertura(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <Button type="submit" disabled={abrirMutation.isPending} className="w-full">Abrir caixa</Button>
        </form>
      </Modal>

      <Modal isOpen={modalAberto === "sangria" || modalAberto === "suprimento"} onClose={fecharModal} title={modalAberto === "sangria" ? "Registrar sangria" : "Registrar suprimento"}>
        <form className="space-y-4" onSubmit={registrarMovimento}>
          <p className="text-sm text-muted-foreground">Este movimento sera registrado em dinheiro e entrara na conferencia do dia.</p>
          <label className="block text-sm font-medium">Valor
            <input type="number" min="0.01" step="0.01" required value={valorMovimento} onChange={(event) => setValorMovimento(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <label className="block text-sm font-medium">Motivo
            <textarea required value={motivoMovimento} onChange={(event) => setMotivoMovimento(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <Button type="submit" disabled={movimentoMutation.isPending} className="w-full">Confirmar movimento</Button>
        </form>
      </Modal>

      <Modal isOpen={modalAberto === "fechar"} onClose={fecharModal} title="Conferir e fechar caixa">
        <form className="space-y-4" onSubmit={fecharCaixa}>
          <p className="text-sm text-muted-foreground">Informe os valores contados ou conciliados. Uma diferenca precisa ser justificada.</p>
          <div className="space-y-2">
            {(formas.length ? formas : ["dinheiro", "pix", "cartao_credito", "cartao_debito"]).map((forma) => (
              <label key={forma} className="grid grid-cols-[1fr_120px] items-center gap-3 text-sm font-medium">
                <span>{FORMAS_LABEL[forma] ?? forma}<small className="mt-0.5 block font-normal text-muted-foreground">Esperado: {formatarMoeda(resumo?.formas[forma] ?? 0)}</small></span>
                <input type="number" min="0" step="0.01" value={valoresContados[forma] ?? ""} onChange={(event) => setValoresContados((atual) => ({ ...atual, [forma]: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-right outline-none focus:ring-2 focus:ring-ring" />
              </label>
            ))}
          </div>
          <div className={`border p-3 text-sm ${diferenca === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"}`}>
            <div className="flex justify-between"><span>Total esperado</span><strong>{formatarMoeda(resumo?.valor_esperado ?? 0)}</strong></div>
            <div className="mt-1 flex justify-between"><span>Total informado</span><strong>{formatarMoeda(totalInformado)}</strong></div>
            <div className="mt-2 flex justify-between border-t border-current/20 pt-2"><span>Diferenca</span><strong>{formatarMoeda(diferenca)}</strong></div>
          </div>
          <label className="block text-sm font-medium">Observacao {diferenca !== 0 ? "(obrigatoria)" : "(opcional)"}
            <textarea required={diferenca !== 0} value={observacaoFechamento} onChange={(event) => setObservacaoFechamento(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <Button type="submit" disabled={fechando} className="w-full"><Banknote data-icon="inline-start" /> Fechar caixa</Button>
        </form>
      </Modal>

      <Modal isOpen={modalAberto === "reabrir"} onClose={fecharModal} title="Reabrir caixa">
        <form className="space-y-4" onSubmit={reabrirCaixa}>
          <p className="text-sm text-muted-foreground">A reabertura preserva o fechamento anterior e registra seu motivo na trilha de auditoria.</p>
          <label className="block text-sm font-medium">Motivo da reabertura
            <textarea required value={motivoReabertura} onChange={(event) => setMotivoReabertura(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <Button type="submit" disabled={reabrirMutation.isPending} className="w-full">Confirmar reabertura</Button>
        </form>
      </Modal>
    </div>
  );
}