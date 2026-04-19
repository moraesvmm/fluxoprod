# PROMPT DE IMPLEMENTAÇÃO: Módulo Produtos/Estoque - Funcionalidades Avançadas

**Data:** 18/04/2026  
**Objetivo:** Implementar funcionalidades avançadas para o módulo de produtos/estoque

---

## CONTEXTO

O sistema já possui módulo básico de produtos/estoque com:
- Tabela `produtos` com campos básicos (nome, sku, preco, estoque_atual, estoque_minimo, etc.)
- Tabela `estoque` para movimentações
- RPCs básicas para CRUD de produtos e movimentações de estoque
- Frontend básico para listagem e gestão

## FUNCIONALIDADES A IMPLEMENTAR

### 1. Alertas de Estoque Mínimo
**Descrição:** Notificações quando estoque atual cair abaixo do estoque mínimo configurado

### 2. Gestão de Kits/Bundles
**Descrição:** Produtos compostos por múltiplos itens (kits, pacotes, bundles)

### 3. Movimentação Entre Locais
**Descrição:** Transferência de estoque entre filiais/depositos

### 4. Valoração de Estoque
**Descrição:** Cálculo de valor do estoque usando diferentes métodos (custo médio, FIFO, LIFO)

### 5. Previsão de Demanda
**Descrição:** Análise histórica de vendas para prever necessidade de reposição

### 6. Códigos de Barras/QR
**Descrição:** Geração e leitura de códigos para gestão física do estoque

---

## WALKTHROUGH DE IMPLEMENTAÇÃO

### SESSÃO 1: Alertas de Estoque Mínimo

**Objetivo:** Implementar sistema de alertas quando estoque cair abaixo do mínimo

**PASSO 1 — Tabela de alertas em apps/api/supabase_rpc.sql:**
```sql
-- Criar tabela alertas_estoque dentro da função provisionar_empresa
CREATE TABLE IF NOT EXISTS alertas_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo_alerta VARCHAR(50) NOT NULL, -- 'estoque_baixo', 'sem_estoque', 'reposicao_sugerida'
  estoque_atual INT NOT NULL,
  estoque_minimo INT NOT NULL,
  mensagem TEXT,
  status VARCHAR(50) DEFAULT 'pendente', -- 'pendente', 'visualizado', 'resolvido'
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  resolvido_em TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_alertas_estoque_produto ON alertas_estoque(produto_id);
CREATE INDEX idx_alertas_estoque_status ON alertas_estoque(status);
CREATE INDEX idx_alertas_estoque_criado_em ON alertas_estoque(criado_em DESC);
```

**PASSO 2 — RPC para verificar e criar alertas:**
```sql
CREATE OR REPLACE FUNCTION tenant_verificar_alertas_estoque()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
DECLARE
  v_alertas_criados INT DEFAULT 0;
BEGIN
  -- Inserir alerta para produtos com estoque abaixo do mínimo
  INSERT INTO alertas_estoque (produto_id, tipo_alerta, estoque_atual, estoque_minimo, mensagem, status)
  SELECT 
    p.id,
    CASE 
      WHEN p.estoque_atual = 0 THEN 'sem_estoque'
      ELSE 'estoque_baixo'
    END,
    p.estoque_atual,
    p.estoque_minimo,
    CASE 
      WHEN p.estoque_atual = 0 THEN CONCAT('Produto ', p.nome, ' está sem estoque')
      ELSE CONCAT('Produto ', p.nome, ' está com estoque abaixo do mínimo (', p.estoque_atual, ' < ', p.estoque_minimo, ')')
    END,
    'pendente'
  FROM produtos p
  WHERE p.estoque_atual <= p.estoque_minimo
    AND p.estoque_minimo > 0
    AND NOT EXISTS (
      SELECT 1 FROM alertas_estoque ae 
      WHERE ae.produto_id = p.id 
        AND ae.status = 'pendente'
        AND ae.criado_em > NOW() - INTERVAL '24 hours'
    );
  
  GET DIAGNOSTICS v_alertas_criados = ROW_COUNT;
  
  RETURN jsonb_build_object('success', true, 'alertas_criados', v_alertas_criados);
END;
$func$;
```

**PASSO 3 — RPC para listar alertas:**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_alertas_estoque(
  p_status VARCHAR DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  produto_id UUID,
  produto_nome VARCHAR,
  tipo_alerta VARCHAR,
  estoque_atual INT,
  estoque_minimo INT,
  mensagem TEXT,
  status VARCHAR,
  criado_em TIMESTAMPTZ,
  resolvido_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    ae.id,
    ae.produto_id,
    p.nome AS produto_nome,
    ae.tipo_alerta,
    ae.estoque_atual,
    ae.estoque_minimo,
    ae.mensagem,
    ae.status,
    ae.criado_em,
    ae.resolvido_em
  FROM alertas_estoque ae
  JOIN produtos p ON p.id = ae.produto_id
  WHERE (p_status IS NULL OR ae.status = p_status)
  ORDER BY ae.criado_em DESC
  LIMIT p_limit OFFSET p_offset;
END;
$func$;
```

**PASSO 4 — RPC para marcar alerta como visualizado/resolvido:**
```sql
CREATE OR REPLACE FUNCTION tenant_resolver_alerta_estoque(
  p_alerta_id UUID,
  p_status VARCHAR, -- 'visualizado' ou 'resolvido'
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
BEGIN
  UPDATE alertas_estoque
  SET status = p_status,
      resolvido_em = CASE WHEN p_status = 'resolvido' THEN NOW() ELSE resolvido_em END
  WHERE id = p_alerta_id;
  
  RETURN jsonb_build_object('success', true);
END;
$func$;
```

**PASSO 5 — API em apps/web/src/lib/api.ts:**
```typescript
export interface AlertaEstoque {
  id: string;
  produto_id: string;
  produto_nome: string;
  tipo_alerta: 'estoque_baixo' | 'sem_estoque' | 'reposicao_sugerida';
  estoque_atual: number;
  estoque_minimo: number;
  mensagem: string;
  status: 'pendente' | 'visualizado' | 'resolvido';
  criado_em: string;
  resolvido_em?: string;
}

export async function verificarAlertasEstoque(): Promise<{ success: boolean; alertas_criados: number }> {
  const { data, error } = await getSupabase().rpc('tenant_verificar_alertas_estoque');
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchAlertasEstoque(status?: string): Promise<AlertaEstoque[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_alertas_estoque', { p_status: status });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function resolverAlertaEstoque(alertaId: string, status: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_resolver_alerta_estoque', { p_alerta_id: alertaId, p_status: status });
  if (error) throw new Error(error.message);
}
```

**PASSO 6 — Hooks em apps/web/src/lib/hooks/use-alertas-estoque.ts:**
```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { verificarAlertasEstoque, fetchAlertasEstoque, resolverAlertaEstoque } from "@/lib/api";

const KEY = ["alertas_estoque"] as const;

export function useAlertasEstoque(status?: string) {
  return useQuery({
    queryKey: [...KEY, status],
    queryFn: () => fetchAlertasEstoque(status),
  });
}

export function useVerificarAlertasEstoque() {
  return useMutation({
    mutationFn: verificarAlertasEstoque,
  });
}

export function useResolverAlertaEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alertaId, status }: { alertaId: string; status: string }) => 
      resolverAlertaEstoque(alertaId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
```

**PASSO 7 — Componente AlertasEstoquePanel.tsx:**
```typescript
"use client";

import { AlertTriangle, CheckCircle, Eye } from "lucide-react";
import { useAlertasEstoque, useResolverAlertaEstapa } from "@/lib/hooks/use-alertas-estoque";
import { Button } from "@/components/ui/button";

export function AlertasEstoquePanel() {
  const { data: alertas, isLoading } = useAlertasEstoque('pendente');
  const resolverMutation = useResolverAlertaEstoque();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Alertas de Estoque</h3>
      {isLoading ? (
        <p>Carregando...</p>
      ) : alertas?.length === 0 ? (
        <p className="text-muted-foreground">Nenhum alerta pendente</p>
      ) : (
        <div className="space-y-2">
          {alertas.map((alerta) => (
            <div key={alerta.id} className="p-3 border rounded-lg bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{alerta.produto_nome}</p>
                  <p className="text-sm text-muted-foreground">{alerta.mensagem}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolverMutation.mutate({ alertaId: alerta.id, status: 'visualizado' })}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resolverMutation.mutate({ alertaId: alerta.id, status: 'resolvido' })}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolver
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**PASSO 8 — Integrar na página de produtos:**
- Adicionar componente AlertasEstoquePanel na página de produtos
- Adicionar botão para verificar alertas manualmente
- Opcional: Adicionar verificação automática via cron job ou webhook

---

### SESSÃO 2: Gestão de Kits/Bundles

**Objetivo:** Implementar produtos compostos por múltiplos itens

**PASSO 1 — Tabela de kits em apps/api/supabase_rpc.sql:**
```sql
-- Criar tabela kits
CREATE TABLE IF NOT EXISTS kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela kit_itens
CREATE TABLE IF NOT EXISTS kit_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade INT NOT NULL DEFAULT 1,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_kits_produto ON kits(produto_id);
CREATE INDEX idx_kit_itens_kit ON kit_itens(kit_id);
CREATE INDEX idx_kit_itens_produto ON kit_itens(produto_id);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION trigger_atualizar_kits()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_kits
BEFORE UPDATE ON kits
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_kits();
```

**PASSO 2 — RPC para criar kit:**
```sql
CREATE OR REPLACE FUNCTION tenant_criar_kit(
  p_produto_id UUID,
  p_nome VARCHAR,
  p_descricao TEXT,
  p_itens JSONB, -- Array de {produto_id, quantidade}
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
DECLARE
  v_kit_id UUID;
  v_item JSONB;
BEGIN
  -- Criar kit
  INSERT INTO kits (produto_id, nome, descricao)
  VALUES (p_produto_id, p_nome, p_descricao)
  RETURNING id INTO v_kit_id;
  
  -- Adicionar itens
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    INSERT INTO kit_itens (kit_id, produto_id, quantidade)
    VALUES (v_kit_id, (v_item->>'produto_id')::UUID, (v_item->>'quantidade')::INT);
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'kit_id', v_kit_id);
END;
$func$;
```

**PASSO 3 — RPC para listar kits com itens:**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_kits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', k.id,
    'produto_id', k.produto_id,
    'produto_nome', p.nome,
    'nome', k.nome,
    'descricao', k.descricao,
    'ativo', k.ativo,
    'itens', (
      SELECT jsonb_agg(jsonb_build_object(
        'produto_id', ki.produto_id,
        'produto_nome', p2.nome,
        'quantidade', ki.quantidade
      ))
      FROM kit_itens ki
      JOIN produtos p2 ON p2.id = ki.produto_id
      WHERE ki.kit_id = k.id
    )
  )) INTO v_result
  FROM kits k
  JOIN produtos p ON p.id = k.produto_id
  WHERE k.ativo = true;
  
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$func$;
```

**PASSO 4 — RPC para atualizar estoque do kit (baixa itens componentes):**
```sql
CREATE OR REPLACE FUNCTION tenant_vender_kit(
  p_kit_id UUID,
  p_quantidade INT DEFAULT 1,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
DECLARE
  v_item RECORD;
  v_estoque_atual INT;
BEGIN
  -- Verificar estoque de cada item
  FOR v_item IN 
    SELECT ki.produto_id, ki.quantidade * p_quantidade AS qtd_necessaria
    FROM kit_itens ki
    WHERE ki.kit_id = p_kit_id
  LOOP
    SELECT estoque_atual INTO v_estoque_atual
    FROM produtos
    WHERE id = v_item.produto_id;
    
    IF v_estoque_atual < v_item.qtd_necessaria THEN
      RETURN jsonb_build_object('error', 'Estoque insuficiente para um dos itens do kit');
    END IF;
  END LOOP;
  
  -- Baixar estoque de cada item
  FOR v_item IN 
    SELECT ki.produto_id, ki.quantidade * p_quantidade AS qtd_baixar
    FROM kit_itens ki
    WHERE ki.kit_id = p_kit_id
  LOOP
    UPDATE produtos
    SET estoque_atual = estoque_atual - v_item.qtd_baixar
    WHERE id = v_item.produto_id;
    
    -- Registrar movimentação
    INSERT INTO estoque (produto_id, tipo, quantidade, observacao)
    VALUES (v_item.produto_id, 'saida', v_item.qtd_baixar, CONCAT('Venda de kit ID: ', p_kit_id));
  END LOOP;
  
  RETURN jsonb_build_object('success', true);
END;
$func$;
```

**PASSO 5 — API em apps/web/src/lib/api.ts:**
```typescript
export interface Kit {
  id: string;
  produto_id: string;
  produto_nome: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  itens: KitItem[];
}

export interface KitItem {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
}

export interface KitCreate {
  produto_id: string;
  nome: string;
  descricao?: string;
  itens: { produto_id: string; quantidade: number }[];
}

export async function criarKit(kit: KitCreate): Promise<{ success: boolean; kit_id: string }> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_kit', { 
      p_produto_id: kit.produto_id,
      p_nome: kit.nome,
      p_descricao: kit.descricao,
      p_itens: JSON.stringify(kit.itens)
    });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchKits(): Promise<Kit[]> {
  const { data, error } = await getSupabase().rpc('tenant_listar_kits');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function venderKit(kitId: string, quantidade?: number): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_vender_kit', { p_kit_id: kitId, p_quantidade: quantidade || 1 });
  if (error) throw new Error(error.message);
}
```

**PASSO 6 — Hooks em apps/web/src/lib/hooks/use-kits.ts:**
```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { criarKit, fetchKits, venderKit } from "@/lib/api";

const KEY = ["kits"] as const;

export function useKits() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchKits,
  });
}

export function useCriarKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: criarKit,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useVenderKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kitId, quantidade }: { kitId: string; quantidade?: number }) => 
      venderKit(kitId, quantidade),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
```

**PASSO 7 — Componente KitsManager.tsx:**
```typescript
"use client";

import { useKits, useCriarKit } from "@/lib/hooks/use-kits";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useState } from "react";

export function KitsManager() {
  const { data: kits, isLoading } = useKits();
  const criarMutation = useCriarKit();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Kits e Bundles</h3>
        <Button onClick={() => setShowModal(true)}>Novo Kit</Button>
      </div>
      
      {isLoading ? (
        <p>Carregando...</p>
      ) : (
        <div className="space-y-2">
          {kits?.map((kit) => (
            <div key={kit.id} className="p-3 border rounded-lg">
              <h4 className="font-medium">{kit.nome}</h4>
              <p className="text-sm text-muted-foreground">{kit.descricao}</p>
              <div className="mt-2 text-sm">
                <strong>Itens:</strong> {kit.itens.map(i => i.produto_nome).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modal de criação de kit */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Kit">
        {/* Formulário de criação */}
      </Modal>
    </div>
  );
}
```

---

### SESSÃO 3: Movimentação Entre Locais

**Objetivo:** Implementar transferência de estoque entre filiais/depositos

**PASSO 1 — Tabela de locais em apps/api/supabase_rpc.sql:**
```sql
-- Criar tabela locais_estoque
CREATE TABLE IF NOT EXISTS locais_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'filial', 'deposito', 'loja'
  endereco TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela estoque_por_local
CREATE TABLE IF NOT EXISTS estoque_por_local (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locais_estoque(id) ON DELETE CASCADE,
  quantidade INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, local_id)
);

-- Criar tabela transferencias_estoque
CREATE TABLE IF NOT EXISTS transferencias_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  local_origem_id UUID NOT NULL REFERENCES locais_estoque(id) ON DELETE CASCADE,
  local_destino_id UUID NOT NULL REFERENCES locais_estoque(id) ON DELETE CASCADE,
  quantidade INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente', -- 'pendente', 'em_transito', 'concluida', 'cancelada'
  observacao TEXT,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  concluida_em TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_locais_estoque_tipo ON locais_estoque(tipo);
CREATE INDEX idx_estoque_por_local_produto ON estoque_por_local(produto_id);
CREATE INDEX idx_estoque_por_local_local ON estoque_por_local(local_id);
CREATE INDEX idx_transferencias_estoque_status ON transferencias_estoque(status);
```

**PASSO 2 — RPC para criar transferência:**
```sql
CREATE OR REPLACE FUNCTION tenant_criar_transferencia(
  p_produto_id UUID,
  p_local_origem_id UUID,
  p_local_destino_id UUID,
  p_quantidade INT,
  p_observacao TEXT,
  p_criado_por UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
DECLARE
  v_transferencia_id UUID;
  v_qtd_origem INT;
BEGIN
  -- Verificar estoque no local de origem
  SELECT quantidade INTO v_qtd_origem
  FROM estoque_por_local
  WHERE produto_id = p_produto_id AND local_id = p_local_origem_id;
  
  IF v_qtd_origem IS NULL OR v_qtd_origem < p_quantidade THEN
    RETURN jsonb_build_object('error', 'Estoque insuficiente no local de origem');
  END IF;
  
  -- Criar transferência
  INSERT INTO transferencias_estoque (
    produto_id, local_origem_id, local_destino_id, quantidade, observacao, criado_por
  )
  VALUES (p_produto_id, p_local_origem_id, p_local_destino_id, p_quantidade, p_observacao, p_criado_por)
  RETURNING id INTO v_transferencia_id;
  
  -- Baixar estoque no local de origem
  UPDATE estoque_por_local
  SET quantidade = quantidade - p_quantidade
  WHERE produto_id = p_produto_id AND local_id = p_local_origem_id;
  
  RETURN jsonb_build_object('success', true, 'transferencia_id', v_transferencia_id);
END;
$func$;
```

**PASSO 3 — RPC para concluir transferência:**
```sql
CREATE OR REPLACE FUNCTION tenant_concluir_transferencia(
  p_transferencia_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
BEGIN
  UPDATE transferencias_estoque
  SET status = 'concluida',
      concluida_em = NOW()
  WHERE id = p_transferencia_id AND status = 'pendente';
  
  -- Adicionar estoque no local de destino
  INSERT INTO estoque_por_local (produto_id, local_id, quantidade)
  SELECT produto_id, local_destino_id, quantidade
  FROM transferencias_estoque
  WHERE id = p_transferencia_id
  ON CONFLICT (produto_id, local_id)
  DO UPDATE SET quantidade = estoque_por_local.quantidade + EXCLUDED.quantidade;
  
  RETURN jsonb_build_object('success', true);
END;
$func$;
```

**PASSO 4 — API e Hooks (seguir padrão):**
- Criar interfaces TypeScript
- Criar funções API
- Criar hooks React Query
- Criar componente de gestão de transferências

---

### SESSÃO 4: Valoração de Estoque

**Objetivo:** Implementar cálculo de valor do estoque usando diferentes métodos

**PASSO 1 — Adicionar colunas de custo em produtos:**
```sql
ALTER TABLE produtos ADD COLUMN custo_unitario NUMERIC(10,2);
ALTER TABLE produtos ADD COLUMN metodo_valoracao VARCHAR(50) DEFAULT 'custo_medio'; -- 'custo_medio', 'fifo', 'lifo'
```

**PASSO 2 — RPC para calcular valor do estoque:**
```sql
CREATE OR REPLACE FUNCTION tenant_calcular_valor_estoque(
  p_metodo VARCHAR DEFAULT 'custo_medio'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
DECLARE
  v_valor_total NUMERIC;
BEGIN
  IF p_metodo = 'custo_medio' THEN
    SELECT SUM(estoque_atual * COALESCE(custo_unitario, 0)) INTO v_valor_total
    FROM produtos;
  ELSIF p_metodo = 'fifo' OR p_metodo = 'lifo' THEN
    -- Implementar FIFO/LIFO usando tabela de movimentações
    -- (mais complexo, requer histórico de custos)
    v_valor_total := 0; -- Placeholder
  END IF;
  
  RETURN jsonb_build_object('valor_total', COALESCE(v_valor_total, 0), 'metodo', p_metodo);
END;
$func$;
```

---

### SESSÃO 5: Previsão de Demanda

**Objetivo:** Análise histórica de vendas para prever necessidade de reposição

**PASSO 1 — Criar tabela de previsões:**
```sql
CREATE TABLE IF NOT EXISTS previsoes_demanda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  demanda_prevista INT NOT NULL,
  demanda_real INT,
  precisao NUMERIC(5,2),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**PASSO 2 — RPC para gerar previsão:**
```sql
CREATE OR REPLACE FUNCTION tenant_gerar_previsao_demanda(
  p_produto_id UUID,
  p_dias_analise INT DEFAULT 30,
  p_dias_previsao INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
DECLARE
  v_media_venda_diaria NUMERIC;
  v_demanda_prevista INT;
BEGIN
  -- Calcular média de vendas diária no período de análise
  SELECT COALESCE(SUM(quantidade), 0) / p_dias_analise INTO v_media_venda_diaria
  FROM estoque
  WHERE produto_id = p_produto_id
    AND tipo = 'saida'
    AND criado_em >= NOW() - (p_dias_analise || ' days')::INTERVAL;
  
  -- Prever demanda para o período futuro
  v_demanda_prevista := ROUND(v_media_venda_diaria * p_dias_previsao);
  
  -- Inserir previsão
  INSERT INTO previsoes_demanda (produto_id, periodo_inicio, periodo_fim, demanda_prevista)
  VALUES (
    p_produto_id,
    CURRENT_DATE,
    CURRENT_DATE + p_dias_previsao,
    v_demanda_prevista
  );
  
  RETURN jsonb_build_object('success', true, 'demanda_prevista', v_demanda_prevista);
END;
$func$;
```

---

### SESSÃO 6: Códigos de Barras/QR

**Objetivo:** Geração e leitura de códigos para gestão física

**PASSO 1 — Adicionar coluna de código de barras:**
```sql
ALTER TABLE produtos ADD COLUMN codigo_barras VARCHAR(50);
ALTER TABLE produtos ADD COLUMN codigo_qr TEXT;
```

**PASSO 2 — RPC para gerar código de barras:**
```sql
CREATE OR REPLACE FUNCTION tenant_gerar_codigo_barras(p_produto_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
DECLARE
  v_codigo_barras VARCHAR(50);
BEGIN
  -- Gerar código EAN-13 ou similar
  -- (pode usar biblioteca externa ou algoritmo simples)
  v_codigo_barras := 'PROD' || LPAD((p_produto_id::TEXT), 10, '0');
  
  UPDATE produtos
  SET codigo_barras = v_codigo_barras
  WHERE id = p_produto_id;
  
  RETURN jsonb_build_object('success', true, 'codigo_barras', v_codigo_barras);
END;
$func$;
```

**PASSO 3 — Frontend para leitura de código de barras:**
- Usar biblioteca como `react-qr-reader` ou `html5-qrcode`
- Integrar na página de produtos para busca rápida por código
- Implementar scanner de código de barras para entrada de estoque

---

## INTEGRAÇÃO FINAL

**PASSO FINAL — Atualizar página de produtos:**
1. Adicionar abas ou seções para cada funcionalidade
2. Integrar componentes de alertas, kits, transferências
3. Adicionar dashboard de valoração e previsão
4. Integrar leitor de código de barras

**PASSO FINAL — Atualizar SESSION_STATE.md:**
1. Documentar todas as funcionalidades implementadas
2. Atualizar status do módulo produtos/estoque
3. Registrar arquivos criados/modificados

**PASSO FINAL — Aplicar SQL no banco:**
1. Criar script SQL para aplicar tabelas em todos os schemas tenant
2. Executar via Service Role
3. Verificar criação correta das tabelas

**PASSO FINAL — Subir servidor e testar:**
1. Iniciar servidor local
2. Testar cada funcionalidade
3. Verificar integração com módulos existentes

---

## OBSERVAÇÕES IMPORTANTES

1. **Seguir padrões do sistema:**
   - Multi-tenant com schema routing
   - RPCs com idempotência e audit_log
   - React Query hooks com invalidação
   - TypeScript estrito

2. **Ordem de implementação sugerida:**
   - Sessão 1 (Alertas) - Menor complexidade, valor imediato
   - Sessão 2 (Kits) - Média complexidade, valor operacional
   - Sessão 3 (Transferências) - Média complexidade, valor operacional
   - Sessão 4 (Valoração) - Baixa complexidade, valor analítico
   - Sessão 5 (Previsão) - Alta complexidade, valor estratégico
   - Sessão 6 (Códigos) - Baixa complexidade, valor operacional

3. **Dependências:**
   - Alertas: Independente
   - Kits: Independente
   - Transferências: Depende de locais (criar primeiro)
   - Valoração: Depende de custos
   - Previsão: Depende de histórico de vendas
   - Códigos: Independente

4. **Testes:**
   - Testar cada RPC individualmente
   - Testar integração com frontend
   - Testar multi-tenancy
   - Testar performance com grandes volumes

---

**Fim do Prompt**
