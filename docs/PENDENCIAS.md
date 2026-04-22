# 📌 PENDÊNCIAS TÉCNICAS - FLUXO ERP

> [!IMPORTANT]
> **REGRA DE OURO:** Toda vez que este documento for lido por um agente ou desenvolvedor, ele deve ser atualizado. Pendências que foram resolvidas durante a sessão devem ser obrigatoriamente retiradas deste arquivo antes do encerramento da tarefa.

---

## 🔴 PENDÊNCIAS CRÍTICAS

### 1. Status de Produção: PRODUCTION-READY (COM RESSALVAS)
**Status Atual:** O sistema está operacional e com build saneado, porém o módulo de comissões está degradado.
**Motivo:** As RPCs necessárias para a gestão de regras de comissão ainda não foram publicadas no banco de dados live.

**Ação Necessária:**
- Publicar o script SQL: [rpc_comissoes_regras.sql](file:///c:/Users/VMORAES1/Documents/fluxoprod/apps/api/migrations/rpc_comissoes_regras.sql)
- **Método de Execução:** Utilizar o Editor SQL do Supabase ou a URI de conexão direta via `psql`.
- **URI de Conexão:** `postgresql://postgres:Vmm041126!Database@db.wkxtlvxotvutycbupfuh.supabase.co:5432/postgres`

---

## 🟠 PENDÊNCIAS DE MÉDIO PRAZO

### 1. Re-vistoria Técnica Pós-Migração
**Descrição:** Após a execução do script de comissões, deve-se realizar uma vistoria completa para validar se os erros de RPC sumiram do frontend.
**Referência:** Vistoria 17 em [VISTORIAS.md](file:///c:/Users/VMORAES1/Documents/fluxoprod/docs/VISTORIAS.md).

---

## ✅ HISTÓRICO DE RESOLUÇÕES RECENTES (22/04/2026)
- [x] Atualização da Documentação Técnica (V2.2) baseada nas Vistorias 16 e 17.
- [x] Saneamento de segurança no Checkout (remoção de senhas do metadata).
- [x] Orquestração de provisionamento via backend.
- [x] Correção de erros de build (fontes Google e html5-qrcode).
