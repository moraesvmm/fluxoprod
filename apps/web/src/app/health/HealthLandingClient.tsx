"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, MotionConfig } from "framer-motion";

/*
 * Paleta fiel ao banner de referencia:
 *   superficie #F6F3FC · veu #EFE9FA · filete #E3D9F6
 *   violeta #7348E8 · tinta #191322 · texto #655F72 · auxiliar #8B849B
 *
 * Estrutura: cabecalho fixo, capa, faixa de especialidades, blocos alternando
 * superficie e branco, encerramento e rodape. Sem cartoes.
 */
const INK = "#191322";
const MUTED = "#655F72";
const FAINT = "#8B849B";
const VIOLET = "#7348E8";
const SURFACE = "#F6F3FC";
const VEIL = "#EFE9FA";
const LINE = "#E3D9F6";

const ALTURA_CABECALHO = "4rem";

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const visivel = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={visivel ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.18em", color: VIOLET }}>
      {children}
    </p>
  );
}

const navegacao = [
  { href: "#dia", label: "Um dia" },
  { href: "#entre", label: "Entre as consultas" },
  { href: "#planos", label: "Planos" },
  { href: "#confianca", label: "Confiança" },
];

const entreConsultas = [
  {
    titulo: "O paciente registra, você acompanha",
    texto:
      "Refeição com foto, nível de dor, humor ou prática em casa, conforme a especialidade. Tudo cai no prontuário, não no seu WhatsApp pessoal às onze da noite.",
    micro: "Registro pelo app do paciente",
  },
  {
    titulo: "Lembretes que ninguém precisa enviar à mão",
    texto:
      "Água, refeição, exercício em casa, cuidado pós-sessão e retorno. A rotina entre as consultas passa a se sustentar sozinha.",
    micro: "Automação por protocolo",
  },
  {
    titulo: "Você sabe antes de perder o paciente",
    texto:
      "Quando alguém para de registrar, falta duas vezes ou some da agenda, o painel avisa. Recuperar quem já confia em você custa menos que conquistar alguém novo.",
    micro: "Alerta de abandono",
  },
];

const dia = [
  {
    hora: "07h50",
    titulo: "Você abre o dia sabendo o que esperar",
    texto:
      "A agenda e o histórico de cada paciente já estão na primeira tela. Nada de abrir pasta, procurar ficha ou conferir planilha antes de começar.",
    micro: "Agenda por profissional e sala",
  },
  {
    hora: "08h40",
    titulo: "O registro acompanha a conversa",
    texto:
      "A evolução é anotada enquanto o atendimento acontece, com o histórico ao lado. O paciente vê o próprio progresso e entende por que vale continuar.",
    micro: "Evolução comparada à série anterior",
  },
  {
    hora: "09h10",
    titulo: "O encerramento não vira tarefa da noite",
    texto:
      "Retorno sugerido, documento entregue e cobrança lançada antes do próximo paciente entrar. Sua noite volta a ser sua.",
    micro: "Retorno, documento e financeiro em uma tela",
  },
];

const modulosBase = [
  { nome: "Agenda", micro: "Profissional, sala, teleconsulta e confirmação automática" },
  { nome: "Pacientes", micro: "Cadastro clínico com linha do tempo completa" },
  { nome: "Prontuário", micro: "Evolução permanente, com autoria e data" },
  { nome: "App do paciente", micro: "Registros, documentos e retornos na mão dele" },
  { nome: "Mensagens", micro: "Canal direto que fica no prontuário, não no seu WhatsApp" },
  { nome: "Documentos", micro: "Atestados, receitas e orientações com a sua marca" },
  { nome: "Financeiro", micro: "Pacotes, recebimentos e inadimplência" },
  { nome: "Painel da clínica", micro: "Ocupação, receita e pacientes em risco de abandono" },
];

type SetorKey = "nutricao" | "fisioterapia" | "odontologia" | "psicologia" | "estetica" | "integrativas";

const setores: {
  key: SetorKey;
  nome: string;
  resumo: string;
  status: string;
  itens: { nome: string; micro: string }[];
}[] = [
  {
    key: "nutricao",
    nome: "Nutrição",
    resumo: "Para quem acompanha evolução corporal consulta a consulta e precisa saber o que acontece nos 29 dias restantes.",
    status: "Primeira especialidade do lançamento",
    itens: [
      { nome: "Antropometria", micro: "Peso, dobras, circunferências e bioimpedância em série" },
      { nome: "Plano alimentar", micro: "Refeições, porções, substituições e macros calculados" },
      { nome: "Diário de refeições", micro: "O paciente registra com foto e horário, direto no app" },
      { nome: "Adesão ao plano", micro: "Percentual de refeições seguidas por semana" },
      { nome: "Lembretes automáticos", micro: "Refeição, hidratação e suplementação" },
      { nome: "Check-in semanal", micro: "Peso, sono, intestino e sintomas sem consulta" },
      { nome: "Lista de compras", micro: "Gerada do próprio plano, pronta para o mercado" },
      { nome: "Recordatório 24h", micro: "Hábito alimentar registrado pelo paciente" },
    ],
  },
  {
    key: "fisioterapia",
    nome: "Fisioterapia",
    resumo: "Para quem vende pacote, prescreve exercício em casa e precisa provar progresso.",
    status: "Entra na sequência do lançamento",
    itens: [
      { nome: "Evolução por sessão", micro: "Conduta e resposta a cada atendimento" },
      { nome: "Prescrição de exercícios", micro: "Séries com vídeo, enviadas ao app do paciente" },
      { nome: "Diário de dor", micro: "Escala EVA registrada em casa, entre as sessões" },
      { nome: "Testes funcionais", micro: "Amplitude, força e dor comparadas no tempo" },
      { nome: "Pacotes e presença", micro: "Sessões usadas, restantes e faltas" },
      { nome: "Alta e reavaliação", micro: "Critério de alta com histórico anexado" },
    ],
  },
  {
    key: "odontologia",
    nome: "Odontologia",
    resumo: "Para quem orça por procedimento, trata por etapas e vive de retorno.",
    status: "Entra na sequência do lançamento",
    itens: [
      { nome: "Odontograma", micro: "Situação por dente e por face" },
      { nome: "Plano de tratamento", micro: "Etapas, execução e pendências" },
      { nome: "Orçamento digital", micro: "Aprovação e parcelamento pelo próprio paciente" },
      { nome: "Imagens e radiografias", micro: "Anexadas ao dente, não a uma pasta solta" },
      { nome: "Recall automático", micro: "Profilaxia lembrada no intervalo que você definir" },
      { nome: "Materiais por procedimento", micro: "Consumo baixado do estoque a cada execução" },
    ],
  },
  {
    key: "psicologia",
    nome: "Psicologia",
    resumo: "Para quem atende em série, acompanha o intervalo e precisa de sigilo real.",
    status: "Entra na sequência do lançamento",
    itens: [
      { nome: "Sessões recorrentes", micro: "Agenda fixa e controle de frequência" },
      { nome: "Evolução narrativa", micro: "Registro livre, sem campo obrigatório" },
      { nome: "Registro de humor", micro: "Paciente marca como esteve entre as sessões" },
      { nome: "Tarefas terapêuticas", micro: "Combinados da sessão, com acompanhamento" },
      { nome: "Sigilo reforçado", micro: "Acesso restrito ao profissional responsável" },
      { nome: "Controle de faltas", micro: "Política de cancelamento aplicada ao financeiro" },
    ],
  },
  {
    key: "estetica",
    nome: "Estética",
    resumo: "Para quem trabalha por protocolo, mostra resultado e vive de renovação de pacote.",
    status: "Entra na sequência do lançamento",
    itens: [
      { nome: "Protocolos", micro: "Sessões, intervalos e produtos usados" },
      { nome: "Registro fotográfico", micro: "Antes e depois com consentimento assinado" },
      { nome: "Ficha de anamnese", micro: "Contraindicações sinalizadas antes do atendimento" },
      { nome: "Cuidados pós-sessão", micro: "Orientações enviadas ao app assim que termina" },
      { nome: "Pacotes", micro: "Venda, uso, vencimento e renovação" },
      { nome: "Retorno sugerido", micro: "Intervalo ideal do protocolo, marcado sozinho" },
    ],
  },
  {
    key: "integrativas",
    nome: "Terapias integrativas",
    resumo: "Para quem precisa de estrutura sem engessar o método.",
    status: "Entra na sequência do lançamento",
    itens: [
      { nome: "Sessões", micro: "Agenda e histórico por paciente" },
      { nome: "Evolução livre", micro: "Formulário próprio da sua abordagem" },
      { nome: "Anamnese personalizada", micro: "Você monta as perguntas, o sistema guarda" },
      { nome: "Acompanhamento entre sessões", micro: "Práticas e registros feitos pelo paciente" },
      { nome: "Pacotes", micro: "Cobrança por ciclo de atendimento" },
    ],
  },
];

const numeros = [
  { valor: "1", legenda: "tela para o dia inteiro" },
  { valor: "0", legenda: "planilhas paralelas" },
  { valor: "100%", legenda: "do histórico preservado" },
];

const garantias = [
  { titulo: "Sem fidelidade", texto: "Você fica enquanto fizer sentido para a sua clínica." },
  { titulo: "Seus dados saem com você", texto: "Exportação completa a qualquer momento, sem precisar pedir autorização." },
  { titulo: "Prontuário permanente", texto: "Evolução clínica não é reescrita nem apagada. O histórico é íntegro por construção." },
  { titulo: "Isolamento por clínica", texto: "Cada clínica ocupa seu próprio espaço no banco de dados. Nada circula entre clientes." },
];

const consultas = [
  { hora: "08:00", nome: "Mariana Costa", tipo: "Primeira consulta", duracao: "40 min" },
  { hora: "09:30", nome: "João Pedro Ramos", tipo: "Retorno · 3ª avaliação", duracao: "30 min" },
  { hora: "11:00", nome: "Ana Luiza Prado", tipo: "Teleconsulta · ajuste de conduta", duracao: "25 min" },
];

const indicadores = [
  { rotulo: "Evolução · Mariana Costa", valor: "−4,2", sufixo: "kg", nota: "em 7 consultas" },
  { rotulo: "Ocupação da semana", valor: "87", sufixo: "%", nota: "4 horários livres" },
  { rotulo: "Sem retorno marcado", valor: "9", sufixo: "", nota: "pacientes para retomar" },
];

export default function HealthLandingClient() {
  const [setorAtivo, setSetorAtivo] = useState<SetorKey>("nutricao");
  const setor = setores.find((s) => s.key === setorAtivo) ?? setores[0];

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen overflow-x-hidden font-sans" style={{ backgroundColor: SURFACE, color: INK }}>

      {/* ───────────── CABEÇALHO ───────────── */}
      <header
        className="fixed top-0 inset-x-0 z-50"
        style={{
          height: ALTURA_CABECALHO,
          backgroundColor: "rgba(246,243,252,0.92)",
          backdropFilter: "saturate(180%) blur(20px)",
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <nav className="max-w-[68rem] mx-auto h-full px-6 sm:px-10 flex items-center justify-between">
          <Link href="/health" className="font-serif text-[1.125rem] tracking-tight">
            Fluxo <span style={{ color: VIOLET }}>Health</span>
          </Link>

          <div className="hidden sm:flex items-center gap-8">
            {navegacao.map((n) => (
              <a key={n.href} href={n.href} className="text-[13px] font-medium transition-opacity hover:opacity-60" style={{ color: MUTED }}>
                {n.label}
              </a>
            ))}
            <a
              href="#lista"
              className="inline-flex items-center h-9 px-4 rounded-[0.5rem] text-[13px] font-medium transition-opacity hover:opacity-85"
              style={{ backgroundColor: VIOLET, color: "#FFFFFF" }}
            >
              Lista de fundadores
            </a>
          </div>

          <a
            href="#lista"
            className="sm:hidden inline-flex items-center h-9 px-4 rounded-[0.5rem] text-[13px] font-medium"
            style={{ backgroundColor: VIOLET, color: "#FFFFFF" }}
          >
            Lista
          </a>
        </nav>
      </header>

      <main style={{ paddingTop: ALTURA_CABECALHO }}>

        {/* ───────────── CAPA ───────────── */}
        <section
          className="relative"
          style={{ background: `linear-gradient(180deg,${VEIL} 0%,${SURFACE} 82%)`, borderBottom: `1px solid ${LINE}` }}
        >
          <div className="max-w-[68rem] mx-auto px-6 sm:px-10 pt-12 sm:pt-24 pb-14 sm:pb-20">
            <div className="max-w-[46rem]">
              <Reveal>
                <Rotulo>Software clínico</Rotulo>
              </Reveal>

              <Reveal delay={0.06}>
                <h1 className="mt-5 sm:mt-6 font-serif font-semibold tracking-[-0.02em] leading-[1.06] text-[2.25rem] sm:text-[3.75rem]">
                  O tempo da consulta
                  <br />
                  pertence ao paciente.
                  <br />
                  <span style={{ color: VIOLET }}>Não ao sistema.</span>
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="mt-6 sm:mt-7 text-[1rem] sm:text-[1.15rem] leading-[1.6] max-w-[33rem]" style={{ color: MUTED }}>
                  Você escolheu cuidar de pessoas, não preencher planilha, procurar ficha
                  e fechar caixa às onze da noite. O Fluxo Health devolve esse tempo.
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <div className="mt-8 sm:mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7">
                  <a
                    href="#planos"
                    className="inline-flex w-full sm:w-auto items-center justify-center h-12 px-6 rounded-[0.625rem] text-[14px] font-medium transition-opacity hover:opacity-85"
                    style={{ backgroundColor: VIOLET, color: "#FFFFFF" }}
                  >
                    Ver planos por especialidade
                  </a>
                  <a href="#dia" className="text-[15px] font-medium transition-opacity hover:opacity-60 py-2 sm:py-0" style={{ color: VIOLET }}>
                    Ver um dia de uso →
                  </a>
                </div>
              </Reveal>

              <Reveal delay={0.24}>
                <p className="mt-7 text-[13px]" style={{ color: FAINT }}>
                  Sem cartão · Sem fidelidade · Seus dados saem com você
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ───────────── FAIXA DE ESPECIALIDADES ───────────── */}
        <section style={{ backgroundColor: VEIL, borderBottom: `1px solid ${LINE}` }}>
          <div className="max-w-[68rem] mx-auto px-6 sm:px-10 py-7">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-10">
              <p className="text-[11px] uppercase shrink-0" style={{ letterSpacing: "0.16em", color: FAINT }}>
                Especialidades atendidas
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {setores.map((s, i) => (
                  <span key={s.key} className="flex items-center gap-3">
                    <span className="font-serif text-[1.0625rem] sm:text-[1.15rem] tracking-tight">{s.nome}</span>
                    {i < setores.length - 1 && (
                      <span aria-hidden className="w-1 h-1 rounded-full" style={{ backgroundColor: "#C9BCE8" }} />
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── O PRODUTO ───────────── */}
        <section className="py-16 sm:py-20">
          <div className="max-w-[68rem] mx-auto px-6 sm:px-10">
            <Reveal>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
                <div>
                  <Rotulo>A primeira tela</Rotulo>
                  <h2 className="mt-3 font-serif font-semibold tracking-[-0.02em] text-[1.6rem] sm:text-[2rem]">
                    Três números conduzem a clínica.
                  </h2>
                </div>
                <p className="text-[13px] max-w-[19rem]" style={{ color: FAINT }}>
                  Ocupação, evolução e quem ainda não voltou. O resto sai do caminho.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div
                className="rounded-[1.5rem] overflow-hidden"
                style={{ backgroundColor: "#FFFFFF", boxShadow: "0 30px 70px -45px rgba(45,26,102,0.32)" }}
              >
                <div className="px-5 sm:px-10 py-6 sm:py-9">
                  <div className="flex items-baseline justify-between">
                    <p className="font-serif text-[1.25rem] tracking-tight">Terça-feira</p>
                    <p className="text-[12px] tabular-nums" style={{ color: FAINT }}>6 atendimentos · 2 retornos</p>
                  </div>

                  <div className="mt-6">
                    {consultas.map((c) => (
                      <div
                        key={c.hora}
                        className="flex items-baseline gap-4 sm:gap-9 py-3.5"
                        style={{ borderTop: `1px solid ${LINE}` }}
                      >
                        <span className="text-[13px] tabular-nums font-medium w-12 shrink-0" style={{ color: VIOLET }}>{c.hora}</span>
                        <span className="text-[15px] font-medium flex-1 min-w-0 truncate">{c.nome}</span>
                        <span className="text-[13px] hidden sm:block flex-1 min-w-0 truncate" style={{ color: MUTED }}>{c.tipo}</span>
                        <span className="text-[12px] tabular-nums" style={{ color: FAINT }}>{c.duracao}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 pt-6 grid grid-cols-2 gap-x-6 gap-y-6 sm:flex sm:flex-wrap sm:items-end sm:gap-x-12 sm:gap-y-5" style={{ borderTop: `1px solid ${LINE}` }}>
                    {indicadores.map((ind) => (
                      <div key={ind.rotulo}>
                        <p className="text-[12px] mb-1" style={{ color: FAINT }}>{ind.rotulo}</p>
                        <p className="font-serif text-[1.6rem] sm:text-[1.85rem] leading-none tracking-tight">
                          {ind.valor}
                          {ind.sufixo && <span className="text-[0.95rem] ml-1" style={{ color: MUTED }}>{ind.sufixo}</span>}
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: FAINT }}>{ind.nota}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ───────────── UM DIA ───────────── */}
        <section
          id="dia"
          className="scroll-mt-16 py-16 sm:py-20"
          style={{ backgroundColor: "#FFFFFF", borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}
        >
          <div className="max-w-[68rem] mx-auto px-6 sm:px-10">
            <Reveal>
              <Rotulo>Um dia comum</Rotulo>
              <h2 className="mt-4 font-serif font-semibold tracking-[-0.02em] leading-[1.1] text-[1.85rem] sm:text-[2.5rem] max-w-[34rem]">
                Você já sabe como sua clínica funciona.
                <br />
                <span style={{ color: VIOLET }}>O sistema é que precisa aprender.</span>
              </h2>
            </Reveal>

            <div className="mt-10">
              {dia.map((d, i) => (
                <Reveal key={d.hora} delay={i * 0.06}>
                  <div
                    className="grid sm:grid-cols-[5rem_1fr] gap-y-3 gap-x-9 py-6"
                    style={{ borderTop: `1px solid ${LINE}` }}
                  >
                    <p className="text-[13px] tabular-nums font-medium pt-1" style={{ color: VIOLET }}>{d.hora}</p>
                    <div className="max-w-[38rem]">
                      <h3 className="font-serif text-[1.25rem] sm:text-[1.4rem] tracking-tight mb-2">{d.titulo}</h3>
                      <p className="text-[15px] leading-[1.65]" style={{ color: MUTED }}>{d.texto}</p>
                      <p className="mt-3 text-[11px] uppercase" style={{ letterSpacing: "0.14em", color: FAINT }}>{d.micro}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── ENTRE AS CONSULTAS ───────────── */}
        <section id="entre" className="scroll-mt-16 py-16 sm:py-20">
          <div className="max-w-[68rem] mx-auto px-6 sm:px-10">
            <Reveal>
              <div className="max-w-[38rem]">
                <Rotulo>Entre as consultas</Rotulo>
                <h2 className="mt-4 font-serif font-semibold tracking-[-0.02em] leading-[1.1] text-[1.85rem] sm:text-[2.5rem]">
                  O cuidado não termina quando o paciente sai.
                  <br />
                  <span style={{ color: VIOLET }}>Nem recomeça do zero no retorno.</span>
                </h2>
                <p className="mt-5 text-[15px] leading-[1.65]" style={{ color: MUTED }}>
                  Trinta dias separam uma consulta da outra. É nesse intervalo que o tratamento
                  funciona ou se perde, e é justamente ele que costuma ficar invisível.
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid sm:grid-cols-3 gap-x-12 gap-y-8">
              {entreConsultas.map((e, i) => (
                <Reveal key={e.titulo} delay={i * 0.06}>
                  <div className="pt-6" style={{ borderTop: `1px solid ${LINE}` }}>
                    <h3 className="font-serif text-[1.2rem] tracking-tight mb-2.5">{e.titulo}</h3>
                    <p className="text-[15px] leading-[1.65]" style={{ color: MUTED }}>{e.texto}</p>
                    <p className="mt-3 text-[11px] uppercase" style={{ letterSpacing: "0.14em", color: FAINT }}>{e.micro}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── PLANOS ───────────── */}
        <section
          id="planos"
          className="scroll-mt-16 py-16 sm:py-20"
          style={{ backgroundColor: "#FFFFFF", borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}
        >
          <div className="max-w-[68rem] mx-auto px-6 sm:px-10">
            <Reveal>
              <div className="max-w-[36rem]">
                <Rotulo>Planos</Rotulo>
                <h2 className="mt-4 font-serif font-semibold tracking-[-0.02em] leading-[1.1] text-[1.85rem] sm:text-[2.5rem]">
                  Escolha a sua especialidade.
                  <br />
                  <span style={{ color: VIOLET }}>O resto já vem pronto.</span>
                </h2>
                <p className="mt-5 text-[15px] leading-[1.65]" style={{ color: MUTED }}>
                  Todo plano nasce com a base clínica completa. A especialidade define as fichas,
                  os formulários e o que a sua consulta precisa medir.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div
                className="mt-9 flex gap-x-7 flex-nowrap overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap sm:gap-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ borderBottom: `1px solid ${LINE}` }}
                role="tablist"
                aria-label="Especialidades disponíveis"
              >
                {setores.map((s) => {
                  const ativo = s.key === setorAtivo;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      role="tab"
                      aria-selected={ativo}
                      onClick={() => setSetorAtivo(s.key)}
                      className="relative text-[15px] font-medium transition-colors pb-3 cursor-pointer whitespace-nowrap shrink-0"
                      style={{ color: ativo ? INK : FAINT }}
                    >
                      {s.nome}
                      {ativo && (
                        <motion.span
                          layoutId="setor-ativo"
                          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                          style={{ backgroundColor: VIOLET }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </Reveal>

            <motion.div
              key={setor.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-9 grid lg:grid-cols-2 gap-x-16 gap-y-10"
            >
              <div>
                <p className="text-[11px] uppercase mb-4" style={{ letterSpacing: "0.16em", color: FAINT }}>
                  Sempre incluso · {modulosBase.length} módulos
                </p>
                {modulosBase.map((m) => (
                  <div
                    key={m.nome}
                    className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                    style={{ borderTop: `1px solid ${LINE}` }}
                  >
                    <span className="text-[15px] font-medium">{m.nome}</span>
                    <span className="text-[12px] sm:text-right" style={{ color: FAINT }}>{m.micro}</span>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[11px] uppercase mb-4" style={{ letterSpacing: "0.16em", color: VIOLET }}>
                  {setor.nome} · {setor.itens.length} módulos do setor
                </p>
                {setor.itens.map((m) => (
                  <div
                    key={m.nome}
                    className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                    style={{ borderTop: `1px solid ${LINE}` }}
                  >
                    <span className="text-[15px] font-medium">{m.nome}</span>
                    <span className="text-[12px] sm:text-right" style={{ color: FAINT }}>{m.micro}</span>
                  </div>
                ))}
                <p className="mt-5 text-[14px] leading-[1.6]" style={{ color: MUTED }}>{setor.resumo}</p>
                <p className="mt-2 text-[12px]" style={{ color: FAINT }}>{setor.status}</p>
              </div>
            </motion.div>

            <Reveal delay={0.08}>
              <div
                className="mt-10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
                style={{ borderTop: `1px solid ${LINE}` }}
              >
                <div>
                  <p className="font-serif text-[1.15rem] tracking-tight">Valores anunciados no lançamento</p>
                  <p className="mt-1 text-[13px]" style={{ color: FAINT }}>
                    Quem entra agora mantém o preço de fundador enquanto for cliente.
                  </p>
                </div>
                <a
                  href="#lista"
                  className="inline-flex w-full sm:w-auto items-center justify-center h-12 px-6 rounded-[0.625rem] text-[14px] font-medium transition-opacity hover:opacity-85 whitespace-nowrap"
                  style={{ backgroundColor: VIOLET, color: "#FFFFFF" }}
                >
                  Reservar vaga em {setor.nome}
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ───────────── NÚMEROS ───────────── */}
        <section className="py-14 sm:py-16" style={{ backgroundColor: INK, color: "#FFFFFF" }}>
          <div className="max-w-[68rem] mx-auto px-6 sm:px-10">
            <div className="grid grid-cols-3 gap-x-4 gap-y-9 sm:gap-x-16">
              {numeros.map((n, i) => (
                <Reveal key={n.legenda} delay={i * 0.06}>
                  <p className="font-serif text-[2rem] sm:text-[3.5rem] leading-none tracking-tight" style={{ color: "#B49BF0" }}>
                    {n.valor}
                  </p>
                  <p className="mt-3 text-[12px] sm:text-[14px]" style={{ color: "#A29BB5" }}>{n.legenda}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── CONFIANÇA ───────────── */}
        <section id="confianca" className="scroll-mt-16 py-16 sm:py-20" style={{ backgroundColor: "#FFFFFF", borderBottom: `1px solid ${LINE}` }}>
          <div className="max-w-[68rem] mx-auto px-6 sm:px-10">
            <Reveal>
              <div className="max-w-[34rem]">
                <Rotulo>Compromissos</Rotulo>
                <h2 className="mt-4 font-serif font-semibold tracking-[-0.02em] leading-[1.1] text-[1.85rem] sm:text-[2.5rem]">
                  Prontuário é o documento
                  <br />
                  mais sensível de uma clínica.
                </h2>
              </div>
            </Reveal>

            <div className="mt-10 grid sm:grid-cols-2 gap-x-16">
              {garantias.map((g, i) => (
                <Reveal key={g.titulo} delay={i * 0.05}>
                  <div className="py-5" style={{ borderTop: `1px solid ${LINE}` }}>
                    <h3 className="font-serif text-[1.15rem] tracking-tight mb-2">{g.titulo}</h3>
                    <p className="text-[15px] leading-[1.6]" style={{ color: MUTED }}>{g.texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── ENCERRAMENTO ───────────── */}
        <section id="lista" className="scroll-mt-16 py-20 sm:py-28" style={{ backgroundColor: VEIL }}>
          <div className="max-w-[68rem] mx-auto px-6 sm:px-10">
            <Reveal>
              <div className="max-w-[40rem]">
                <Rotulo>Pré-lançamento</Rotulo>
                <h2 className="mt-4 font-serif font-semibold tracking-[-0.02em] leading-[1.06] text-[2.1rem] sm:text-[3rem]">
                  As primeiras clínicas
                  <br />
                  <span style={{ color: VIOLET }}>desenham o produto.</span>
                </h2>
                <p className="mt-6 text-[1.0625rem] leading-[1.6] max-w-[33rem]" style={{ color: MUTED }}>
                  Estamos construindo com um grupo pequeno de clínicas, sobre uma plataforma
                  que já opera em produção. Quem entra agora define prioridades, recebe a
                  própria especialidade primeiro e mantém o preço de fundador.
                </p>

                <div className="mt-8 sm:mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7">
                  <a
                    href="https://www.seufluxoerp.com.br"
                    className="inline-flex w-full sm:w-auto items-center justify-center h-12 px-6 rounded-[0.625rem] text-[14px] font-medium transition-opacity hover:opacity-85"
                    style={{ backgroundColor: VIOLET, color: "#FFFFFF" }}
                  >
                    Quero conversar sobre a minha clínica
                  </a>
                  <Link href="/login" className="text-[15px] font-medium transition-opacity hover:opacity-60 py-2 sm:py-0" style={{ color: MUTED }}>
                    Já uso o Fluxo ERP
                  </Link>
                </div>

                <p className="mt-6 text-[13px]" style={{ color: FAINT }}>
                  Conversa de 20 minutos, sem apresentação comercial. Se não fizer sentido para a sua clínica, dizemos.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ───────────── RODAPÉ ───────────── */}
      <footer style={{ backgroundColor: INK, color: "#FFFFFF" }}>
        <div className="max-w-[68rem] mx-auto px-6 sm:px-10 py-12">
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <p className="font-serif text-[1.125rem] tracking-tight">
                Fluxo <span style={{ color: "#B49BF0" }}>Health</span>
              </p>
              <p className="mt-2 text-[13px] leading-[1.6]" style={{ color: "#A29BB5" }}>
                Software clínico sobre a plataforma do Fluxo ERP.
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase mb-3" style={{ letterSpacing: "0.16em", color: "#8179A0" }}>Navegar</p>
              <div className="flex flex-col gap-2">
                {navegacao.map((n) => (
                  <a key={n.href} href={n.href} className="text-[13px] transition-opacity hover:opacity-70" style={{ color: "#A29BB5" }}>
                    {n.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase mb-3" style={{ letterSpacing: "0.16em", color: "#8179A0" }}>Dados</p>
              <p className="text-[13px] leading-[1.6]" style={{ color: "#A29BB5" }}>
                Hospedagem no Brasil. Prontuário tratado como dado sensível, conforme a LGPD.
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-[12px]" style={{ color: "#8179A0" }}>© 2026 Fluxo. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
