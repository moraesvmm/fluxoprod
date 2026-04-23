# Implementação Pendente: Painel Administrativo de Preços

**Data de Criação:** 23/04/2026
**Prioridade:** Alta
**Complexidade:** Média-Alta
**Estimativa:** 4-6 horas
**Status:** Aguardando priorização

---

## Resumo Executivo

Sistema de gerenciamento de preços dinâmico no módulo mestre (master-admin), permitindo alteração de valores de planos e módulos avulsos sem necessidade de deploy, com suporte a promoções temporárias, histórico de alterações e validações de segurança.

---

## 1. Estrutura de Banco de Dados

### 1.1 Tabelas Principais

```sql
-- Tabela de Planos
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- starter, business, pro
  nome TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  preco_promocional DECIMAL(10,2),
  descricao TEXT,
  modulos_incluidos TEXT[] DEFAULT '{}',
  ordem_exibicao INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Módulos Avulsos
CREATE TABLE IF NOT EXISTS public.modulos_avulsos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- os, obras, comissoes, relatorios, rh
  nome TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  preco_promocional DECIMAL(10,2),
  descricao TEXT,
  icone TEXT,
  features TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  ordem_exibicao INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Promoções
CREATE TABLE IF NOT EXISTS public.promocoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL, -- "Black Friday", "Lançamento", etc
  descricao TEXT,
  cor_gradiente TEXT DEFAULT 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
  icone_svg TEXT, -- SVG inline do ícone flutuante
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  ativa BOOLEAN DEFAULT true,
  criado_por UUID REFERENCES public.user_profiles(id),
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Vínculo Promoção-Plano/Módulo
CREATE TABLE IF NOT EXISTS public.promocoes_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promocao_id UUID REFERENCES public.promocoes(id) ON DELETE CASCADE,
  tipo_vinculo TEXT NOT NULL CHECK (tipo_vinculo IN ('plano', 'modulo_avulso')),
  referencia_id UUID NOT NULL, -- ID do plano ou módulo
  preco_promocional DECIMAL(10,2) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Histórico de Preços (Audit Trail)
CREATE TABLE IF NOT EXISTS public.historico_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('plano', 'modulo_avulso')),
  referencia_id UUID NOT NULL,
  preco_anterior DECIMAL(10,2) NOT NULL,
  preco_novo DECIMAL(10,2) NOT NULL,
  foi_promocional BOOLEAN DEFAULT false,
  promocao_id UUID REFERENCES public.promocoes(id),
  alterado_por UUID REFERENCES public.user_profiles(id),
  motivo TEXT,
  ip_address INET,
  user_agent TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Índices e Constraints

```sql
-- Índices
CREATE INDEX idx_planos_key ON public.planos(key);
CREATE INDEX idx_planos_ativo ON public.planos(ativo);
CREATE INDEX idx_modulos_avulsos_key ON public.modulos_avulsos(key);
CREATE INDEX idx_modulos_avulsos_ativo ON public.modulos_avulsos(ativo);
CREATE INDEX idx_promocoes_ativa ON public.promocoes(ativa);
CREATE INDEX idx_promocoes_datas ON public.promocoes(data_inicio, data_fim);
CREATE INDEX idx_promocoes_vinculos_promocao ON public.promocoes_vinculos(promocao_id);
CREATE INDEX idx_historico_precos_referencia ON public.historico_precos(referencia_id);
CREATE INDEX idx_historico_precos_data ON public.historico_precos(criado_em DESC);

-- Constraint única para evitar duplicidade de vínculos
CREATE UNIQUE INDEX idx_promocoes_vinculos_unico 
ON public.promocoes_vinculos(promocao_id, tipo_vinculo, referencia_id);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_planos_updated_at BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modulos_avulsos_updated_at BEFORE UPDATE ON public.modulos_avulsos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 2. RPCs (Supabase)

### 2.1 Listagem

```sql
-- Listar planos ativos (com preço promocional se houver)
CREATE OR REPLACE FUNCTION public.listar_planos_ativos()
RETURNS TABLE (
  id UUID,
  key TEXT,
  nome TEXT,
  preco DECIMAL,
  preco_promocional DECIMAL,
  descricao TEXT,
  modulos_incluidos TEXT[],
  ordem_exibicao INTEGER,
  promocao_ativa JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.key, p.nome, p.preco, p.preco_promocional,
    p.descricao, p.modulos_incluidos, p.ordem_exibicao,
    (
      SELECT jsonb_build_object(
        'nome', pr.nome,
        'cor_gradiente', pr.cor_gradiente,
        'icone_svg', pr.icone_svg,
        'data_fim', pr.data_fim
      )
      FROM public.promocoes_vinculos pv
      JOIN public.promocoes pr ON pr.id = pv.promocao_id
      WHERE pv.referencia_id = p.id 
        AND pv.tipo_vinculo = 'plano'
        AND pr.ativa = true
        AND pr.data_inicio <= now()
        AND pr.data_fim >= now()
      LIMIT 1
    ) as promocao_ativa
  FROM public.planos p
  WHERE p.ativo = true
  ORDER BY p.ordem_exibicao ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Listar módulos avulsos ativos
CREATE OR REPLACE FUNCTION public.listar_modulos_avulsos_ativos()
RETURNS TABLE (
  id UUID,
  key TEXT,
  nome TEXT,
  preco DECIMAL,
  preco_promocional DECIMAL,
  descricao TEXT,
  icone TEXT,
  features TEXT[],
  ordem_exibicao INTEGER,
  promocao_ativa JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, m.key, m.nome, m.preco, m.preco_promocional,
    m.descricao, m.icone, m.features, m.ordem_exibicao,
    (
      SELECT jsonb_build_object(
        'nome', pr.nome,
        'cor_gradiente', pr.cor_gradiente,
        'icone_svg', pr.icone_svg,
        'data_fim', pr.data_fim
      )
      FROM public.promocoes_vinculos pv
      JOIN public.promocoes pr ON pr.id = pv.promocao_id
      WHERE pv.referencia_id = m.id 
        AND pv.tipo_vinculo = 'modulo_avulso'
        AND pr.ativa = true
        AND pr.data_inicio <= now()
        AND pr.data_fim >= now()
      LIMIT 1
    ) as promocao_ativa
  FROM public.modulos_avulsos m
  WHERE m.ativo = true
  ORDER BY m.ordem_exibicao ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.2 Atualização com Segurança

```sql
-- Atualizar preço com validações de segurança
CREATE OR REPLACE FUNCTION public.atualizar_preco_seguro(
  p_tipo TEXT,
  p_referencia_id UUID,
  p_novo_preco DECIMAL,
  p_alterado_por UUID,
  p_motivo TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_preco_anterior DECIMAL;
  v_nome TEXT;
  v_result JSONB;
BEGIN
  -- Validações de segurança
  IF p_novo_preco <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Preço deve ser maior que zero');
  END IF;
  
  IF p_novo_preco > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Preço excede limite máximo permitido (R$ 10.000)');
  END IF;

  -- Buscar dados atuais
  IF p_tipo = 'plano' THEN
    SELECT preco, nome INTO v_preco_anterior, v_nome
    FROM public.planos WHERE id = p_referencia_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Plano não encontrado');
    END IF;
    
    -- Impedir redução drástica (> 50% sem motivo)
    IF p_novo_preco < (v_preco_anterior * 0.5) AND (p_motivo IS NULL OR LENGTH(TRIM(p_motivo)) < 10) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Redução maior que 50% requer motivo detalhado');
    END IF;
    
    UPDATE public.planos SET preco = p_novo_preco WHERE id = p_referencia_id;
    
  ELSIF p_tipo = 'modulo_avulso' THEN
    SELECT preco, nome INTO v_preco_anterior, v_nome
    FROM public.modulos_avulsos WHERE id = p_referencia_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Módulo avulso não encontrado');
    END IF;
    
    IF p_novo_preco < (v_preco_anterior * 0.5) AND (p_motivo IS NULL OR LENGTH(TRIM(p_motivo)) < 10) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Redução maior que 50% requer motivo detalhado');
    END IF;
    
    UPDATE public.modulos_avulsos SET preco = p_novo_preco WHERE id = p_referencia_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Tipo inválido');
  END IF;

  -- Registrar histórico
  INSERT INTO public.historico_precos (
    tipo, referencia_id, preco_anterior, preco_novo,
    alterado_por, motivo, ip_address, user_agent
  ) VALUES (
    p_tipo, p_referencia_id, v_preco_anterior, p_novo_preco,
    p_alterado_por, p_motivo, p_ip_address, p_user_agent
  );

  RETURN jsonb_build_object(
    'success', true,
    'nome', v_nome,
    'preco_anterior', v_preco_anterior,
    'preco_novo', p_novo_preco
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 Gerenciamento de Promoções

```sql
-- Criar promoção
CREATE OR REPLACE FUNCTION public.criar_promocao(
  p_nome TEXT,
  p_descricao TEXT,
  p_cor_gradiente TEXT,
  p_icone_svg TEXT,
  p_data_inicio TIMESTAMPTZ,
  p_data_fim TIMESTAMPTZ,
  p_criado_por UUID
)
RETURNS UUID AS $$
DECLARE
  v_promocao_id UUID;
BEGIN
  INSERT INTO public.promocoes (
    nome, descricao, cor_gradiente, icone_svg,
    data_inicio, data_fim, criado_por
  ) VALUES (
    p_nome, p_descricao, p_cor_gradiente, p_icone_svg,
    p_data_inicio, p_data_fim, p_criado_por
  ) RETURNING id INTO v_promocao_id;
  
  RETURN v_promocao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vincular promoção a plano/módulo
CREATE OR REPLACE FUNCTION public.vincular_promocao(
  p_promocao_id UUID,
  p_tipo_vinculo TEXT,
  p_referencia_id UUID,
  p_preco_promocional DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validar se promoção está ativa
  IF NOT EXISTS (
    SELECT 1 FROM public.promocoes 
    WHERE id = p_promocao_id AND ativa = true
  ) THEN
    RAISE EXCEPTION 'Promoção não encontrada ou inativa';
  END IF;

  INSERT INTO public.promocoes_vinculos (
    promocao_id, tipo_vinculo, referencia_id, preco_promocional
  ) VALUES (
    p_promocao_id, p_tipo_vinculo, p_referencia_id, p_preco_promocional
  )
  ON CONFLICT (promocao_id, tipo_vinculo, referencia_id) 
  DO UPDATE SET preco_promocional = p_preco_promocional;
  
  -- Atualizar preco_promocional na tabela base
  IF p_tipo_vinculo = 'plano' THEN
    UPDATE public.planos SET preco_promocional = p_preco_promocional WHERE id = p_referencia_id;
  ELSIF p_tipo_vinculo = 'modulo_avulso' THEN
    UPDATE public.modulos_avulsos SET preco_promocional = p_preco_promocional WHERE id = p_referencia_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Desativar promoção
CREATE OR REPLACE FUNCTION public.desativar_promocao(p_promocao_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.promocoes SET ativa = false WHERE id = p_promocao_id;
  
  -- Remover preços promocionais dos vinculos
  UPDATE public.planos SET preco_promocional = NULL 
  WHERE id IN (
    SELECT referencia_id FROM public.promocoes_vinculos 
    WHERE promocao_id = p_promocao_id AND tipo_vinculo = 'plano'
  );
  
  UPDATE public.modulos_avulsos SET preco_promocional = NULL 
  WHERE id IN (
    SELECT referencia_id FROM public.promocoes_vinculos 
    WHERE promocao_id = p_promocao_id AND tipo_vinculo = 'modulo_avulso'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. Frontend - Página Administrativa

### 3.1 Estrutura de Arquivos

```
apps/web/src/
├── app/
│   └── (master)/
│       └── admin/
│           └── precos/
│               ├── page.tsx              # Página principal
│               ├── loading.tsx           # Skeleton loading
│               └── error.tsx             # Error boundary
├── components/
│   └── admin/
│       ├── precos/
│       │   ├── TabelaPlanos.tsx         # Lista de planos
│       │   ├── TabelaModulos.tsx        # Lista de módulos
│       │   ├── FormularioEdicao.tsx     # Modal de edição
│       │   ├── FormularioPromocao.tsx   # Modal de promoção
│       │   ├── BadgePromocao.tsx        # Componente de ícone flutuante
│       │   ├── HistoricoAlteracoes.tsx  # Timeline de mudanças
│       │   └── PreviewCheckout.tsx      # Preview visual
│       └── shared/
│           ├── CardPreco.tsx
│           ├── InputMoeda.tsx
│           └── TooltipInfo.tsx
├── lib/
│   ├── hooks/
│   │   └── admin/
│   │       └── use-precos-admin.ts      # React Query hooks
│   └── api/
│       └── admin/
│           └── precos.ts                # Funções de API
└── types/
    └── admin/
        └── precos.ts                    # Typescript interfaces
```

### 3.2 Componente BadgePromocao (Ícone Flutuante)

```typescript
// apps/web/src/components/admin/precos/BadgePromocao.tsx

interface BadgePromocaoProps {
  nome: string;
  corGradiente: string;
  iconeSvg?: string;
  dataFim: string;
  tamanho?: 'sm' | 'md' | 'lg';
}

export function BadgePromocao({
  nome,
  corGradiente,
  iconeSvg,
  dataFim,
  tamanho = 'md'
}: BadgePromocaoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm'
  };

  return (
    <div className="relative group">
      {/* Badge flutuante */}
      <div
        className={`
          ${sizeClasses[tamanho]}
          rounded-full flex items-center justify-center
          animate-pulse shadow-lg
          cursor-help transition-transform hover:scale-110
        `}
        style={{
          background: corGradiente || 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
        }}
      >
        {iconeSvg ? (
          <div dangerouslySetInnerHTML={{ __html: iconeSvg }} />
        ) : (
          <span className="text-white font-bold">%</span>
        )}
      </div>

      {/* Tooltip expansivo */}
      <div className="
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2
        opacity-0 invisible group-hover:opacity-100 group-hover:visible
        transition-all duration-300 z-50
        whitespace-nowrap
      ">
        <div className="
          bg-gradient-to-r from-indigo-600 to-violet-600
          text-white px-4 py-2 rounded-xl
          text-sm font-medium
          shadow-2xl border border-white/20
        ">
          <div className="font-semibold">{nome}</div>
          <div className="text-xs text-white/80">
            Até {new Date(dataFim).toLocaleDateString('pt-BR')}
          </div>
        </div>
        {/* Seta */}
        <div className="
          absolute top-full left-1/2 -translate-x-1/2
          border-8 border-transparent
          border-t-indigo-600
        " />
      </div>

      {/* Efeito de brilho */}
      <div className="
        absolute inset-0 rounded-full
        bg-gradient-to-r from-transparent via-white/30 to-transparent
        animate-[shimmer_2s_infinite]
      " />
    </div>
  );
}
```

### 3.3 Estilos CSS (Tailwind)

```css
/* Animações customizadas */
@keyframes shimmer {
  0% { transform: translateX(-100%) rotate(45deg); }
  100% { transform: translateX(100%) rotate(45deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
```

---

## 4. API Routes

### 4.1 Listagem de Preços

```typescript
// apps/web/src/app/api/admin/precos/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Verificar se usuário é master
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "master") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Buscar planos e módulos
    const [planosResult, modulosResult, promocoesResult] = await Promise.all([
      supabase.rpc("listar_planos_ativos"),
      supabase.rpc("listar_modulos_avulsos_ativos"),
      supabase.from("promocoes").select("*").eq("ativa", true)
    ]);

    return NextResponse.json({
      planos: planosResult.data || [],
      modulos: modulosResult.data || [],
      promocoes: promocoesResult.data || []
    });
  } catch (error: any) {
    console.error("Erro ao buscar preços:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}
```

### 4.2 Atualização de Preço

```typescript
// apps/web/src/app/api/admin/precos/atualizar/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const headersList = await headers();

    // Verificar autenticação e role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "master") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { tipo, referencia_id, novo_preco, motivo } = body;

    // Capturar metadata de segurança
    const ip_address = request.headers.get("x-forwarded-for") || "0.0.0.0";
    const user_agent = headersList.get("user-agent") || "unknown";

    // Chamar RPC de atualização segura
    const { data, error } = await supabase.rpc("atualizar_preco_seguro", {
      p_tipo: tipo,
      p_referencia_id: referencia_id,
      p_novo_preco: novo_preco,
      p_alterado_por: profile.id,
      p_motivo: motivo,
      p_ip_address: ip_address,
      p_user_agent: user_agent
    });

    if (error) throw error;

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || "Falha na atualização" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });
  } catch (error: any) {
    console.error("Erro ao atualizar preço:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}
```

---

## 5. Checkout - Integração com Preços Dinâmicos

### 5.1 Hook Atualizado

```typescript
// apps/web/src/lib/hooks/use-precos.ts

import { useQuery } from "@tanstack/react-query";

interface Plano {
  id: string;
  key: string;
  nome: string;
  preco: number;
  preco_promocional?: number;
  descricao: string;
  modulos_incluidos: string[];
  promocao_ativa?: {
    nome: string;
    cor_gradiente: string;
    icone_svg: string;
    data_fim: string;
  };
}

interface ModuloAvulso {
  id: string;
  key: string;
  nome: string;
  preco: number;
  preco_promocional?: number;
  descricao: string;
  icone: string;
  features: string[];
  promocao_ativa?: {
    nome: string;
    cor_gradiente: string;
    icone_svg: string;
    data_fim: string;
  };
}

export function usePrecos() {
  return useQuery<{ planos: Plano[]; modulosAvulsos: ModuloAvulso[] }>({
    queryKey: ["precos"],
    queryFn: async () => {
      const response = await fetch("/api/planos");
      if (!response.ok) throw new Error("Falha ao buscar preços");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Helper para obter preço efetivo
export function getPrecoEfetivo(item: Plano | ModuloAvulso): number {
  // Verificar se há promoção ativa e válida
  if (item.preco_promocional && item.preco_promocional > 0) {
    if (item.promocao_ativa) {
      const dataFim = new Date(item.promocao_ativa.data_fim);
      if (dataFim > new Date()) {
        return item.preco_promocional;
      }
    }
    return item.preco_promocional;
  }
  return item.preco;
}
```

### 5.2 Componente de Checkout com Badge

```typescript
// apps/web/src/components/checkout/CardPlano.tsx

import { BadgePromocao } from "@/components/admin/precos/BadgePromocao";
import { getPrecoEfetivo } from "@/lib/hooks/use-precos";

interface CardPlanoProps {
  plano: Plano;
  selecionado: boolean;
  onClick: () => void;
}

export function CardPlano({ plano, selecionado, onClick }: CardPlanoProps) {
  const precoEfetivo = getPrecoEfetivo(plano);
  const temPromocao = precoEfetivo < plano.preco;

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl p-6 cursor-pointer
        border-2 transition-all duration-300
        ${selecionado 
          ? "border-violet-500 bg-violet-500/10" 
          : "border-white/10 bg-white/5 hover:border-white/20"
        }
      `}
    >
      {/* Badge de promoção flutuante */}
      {temPromocao && plano.promocao_ativa && (
        <div className="absolute -top-3 -right-3 z-10">
          <BadgePromocao
            nome={plano.promocao_ativa.nome}
            corGradiente={plano.promocao_ativa.cor_gradiente}
            iconeSvg={plano.promocao_ativa.icone_svg}
            dataFim={plano.promocao_ativa.data_fim}
            tamanho="md"
          />
        </div>
      )}

      {/* Conteúdo do card */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">{plano.nome}</h3>
        <p className="text-sm text-white/60">{plano.descricao}</p>
      </div>

      {/* Preço */}
      <div className="flex items-baseline gap-2">
        {temPromocao && (
          <span className="text-lg text-white/40 line-through">
            R$ {plano.preco.toFixed(2)}
          </span>
        )}
        <span className="text-3xl font-bold text-white">
          R$ {precoEfetivo.toFixed(2)}
        </span>
        <span className="text-sm text-white/60">/mês</span>
      </div>
    </div>
  );
}
```

---

## 6. Seed de Dados Inicial

```sql
-- Inserir planos base
INSERT INTO public.planos (key, nome, preco, descricao, modulos_incluidos, ordem_exibicao) VALUES
  ('starter', 'Starter', 249.00, 'Entrada e Visibilidade', 
   ARRAY['dashboard', 'crm', 'catalogo', 'estoque'], 1),
  ('business', 'Business', 499.00, 'Operação Central', 
   ARRAY['dashboard', 'crm', 'catalogo', 'estoque', 'vendas', 'financeiro', 'rh'], 2),
  ('pro', 'Pro', 849.00, 'Vertical Completo', 
   ARRAY['dashboard', 'crm', 'catalogo', 'estoque', 'vendas', 'financeiro', 'rh', 'os', 'obras', 'comissoes', 'relatorios'], 3)
ON CONFLICT (key) DO UPDATE SET
  nome = EXCLUDED.nome,
  preco = EXCLUDED.preco,
  descricao = EXCLUDED.descricao,
  modulos_incluidos = EXCLUDED.modulos_incluidos;

-- Inserir módulos avulsos
INSERT INTO public.modulos_avulsos (key, nome, preco, descricao, icone, features, ordem_exibicao) VALUES
  ('os', 'Ordem de Serviço', 79.90, 'Acompanhamento completo para serviços pontuais', '🔧',
   ARRAY['OS numerada com status em tempo real', 'Atribuição a colaboradores', 'Registro do histórico'], 1),
  ('obras', 'Gestão de Obras', 79.90, 'Controle especializado para projetos de longa duração', '🏗️',
   ARRAY['Cronograma por etapas', 'Financeiro integrado', 'Gestão de recursos'], 2),
  ('comissoes', 'Comissões', 79.90, 'Gestão transparente das premiações de venda', '💰',
   ARRAY['Cálculo automático integrado ao PDV', 'Histórico auditável', 'Relatórios por vendedor'], 3),
  ('relatorios', 'Relatórios', 79.90, 'Visão analítica avançada da operação', '📄',
   ARRAY['Consolidação de dados', 'Visão estratégica', 'Agiliza controle contábil'], 4),
  ('rh', 'RH & Pessoal', 79.90, 'Módulo administrativo da equipe', '👥',
   ARRAY['Gestão de colaboradores', 'Cadastro de cargos', 'Cálculo de comissões'], 5)
ON CONFLICT (key) DO UPDATE SET
  nome = EXCLUDED.nome,
  preco = EXCLUDED.preco,
  descricao = EXCLUDED.descricao,
  features = EXCLUDED.features;
```

---

## 7. Impacto no Asaas e Webhook

### 7.1 Análise de Impacto

**✅ NENHUMA alteração necessária no Asaas ou URL de webhook.**

**Justificativa:**

1. **Asaas é agnóstico a preços**: O gateway de pagamento apenas recebe o valor (`value`) no payload e processa. Não mantém catálogo de produtos/planos.

2. **Webhook existente funciona**: O endpoint `/api/webhook/payment` atual:
   - Recebe notificação de pagamento
   - Extrai `externalReference` (checkout ID)
   - Busca dados completos em `checkout_vendas`
   - Provisiona empresa com módulos selecionados

3. **Fluxo de dados preservado**:
   ```
   Banco (planos/preços) → Frontend (cálculo) → API (envia amount) → Asaas (cobrança)
                                                           ↓
   Webhook (recebe pagamento) → Provisiona com base em checkout_vendas.config_payload
   ```

### 7.2 Única Mudança Necessária no Checkout

Arquivo: `apps/web/src/app/api/checkout/session/route.ts`

```typescript
// Linha ~137: Atualizar descrição para incluir promoção
const paymentResponse = await fetch(`https://${mode}.asaas.com/v3/payments`, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({
    customer: customerId,
    billingType: "PIX",
    value: payload.amount,  // ← Já vem calculado do frontend
    dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    description: `Assinatura Fluxo ERP - Plano ${payload.planName}`,  // ← Opcional: incluir info de promoção
    externalReference: checkoutReference,
    metadata: { ... },
    callback: { ... }
  }),
});
```

**Nenhuma alteração estrutural necessária.**

---

## 8. Checklist de Implementação

### Fase 1: Banco de Dados (1 hora)
- [ ] Executar script de criação de tabelas
- [ ] Executar seed de dados
- [ ] Verificar índices e constraints
- [ ] Testar RPCs via SQL Editor

### Fase 2: Backend (1.5 horas)
- [ ] Criar API route `/api/admin/precos`
- [ ] Criar API route `/api/admin/precos/atualizar`
- [ ] Criar API route `/api/planos` (público)
- [ ] Testar endpoints via Postman/Insomnia

### Fase 3: Frontend Admin (2 horas)
- [ ] Criar página `/mestre/admin/precos`
- [ ] Componente `TabelaPlanos`
- [ ] Componente `TabelaModulos`
- [ ] Componente `FormularioEdicao`
- [ ] Componente `FormularioPromocao`
- [ ] Componente `BadgePromocao`
- [ ] Componente `HistoricoAlteracoes`

### Fase 4: Frontend Checkout (1 hora)
- [ ] Refatorar `checkout/page.tsx` para usar `usePrecos`
- [ ] Criar `CardPlano` com badge promocional
- [ ] Criar `CardModulo` com badge promocional
- [ ] Testar fluxo completo de compra

### Fase 5: Testes e Validação (30 min)
- [ ] Testar alteração de preço
- [ ] Testar criação de promoção
- [ ] Testar vinculação de promoção
- [ ] Testar checkout com preço normal
- [ ] Testar checkout com preço promocional
- [ ] Verificar histórico de alterações

---

## 9. Segurança e Governança

### 9.1 Prevenção de Fraudes Internas

```sql
-- View para auditoria de alterações suspeitas
CREATE OR REPLACE VIEW auditoria_precos_suspeitos AS
SELECT 
  h.*,
  p.nome as nome_referencia,
  CASE 
    WHEN h.preco_novo < (h.preco_anterior * 0.5) THEN 'REDUCAO_DRASTICA'
    WHEN h.preco_novo > (h.preco_anterior * 2) THEN 'AUMENTO_DRASTICO'
    ELSE 'NORMAL'
  END as alerta_tipo
FROM public.historico_precos h
LEFT JOIN public.planos p ON h.referencia_id = p.id AND h.tipo = 'plano'
LEFT JOIN public.modulos_avulsos m ON h.referencia_id = m.id AND h.tipo = 'modulo_avulso'
WHERE h.criado_em > now() - interval '30 days'
ORDER BY h.criado_em DESC;
```

### 9.2 Notificações (Opcional Futuro)

- Slack/Email para alterações > 20%
- Dashboard de alertas em tempo real
- Bloqueio automático de alterações > 50% sem aprovação

---

## 10. Documentação para Deploy

### 10.1 Arquivos a Versionar

```
docs/
  └── implementacao_pendente_painel_precos.md  ✅ (este arquivo)

apps/web/src/
  ├── app/
  │   ├── (master)/admin/precos/page.tsx
  │   └── api/
  │       ├── admin/precos/route.ts
  │       ├── admin/precos/atualizar/route.ts
  │       └── planos/route.ts
  ├── components/admin/precos/
  │   ├── TabelaPlanos.tsx
  │   ├── TabelaModulos.tsx
  │   ├── FormularioEdicao.tsx
  │   ├── FormularioPromocao.tsx
  │   ├── BadgePromocao.tsx
  │   ├── HistoricoAlteracoes.tsx
  │   └── PreviewCheckout.tsx
  ├── lib/
  │   ├── hooks/admin/use-precos-admin.ts
  │   └── api/admin/precos.ts
  └── types/admin/precos.ts

apps/api/
  └── migrations/
      └── 20260423_painel_precos.sql
```

### 10.2 Rollback

```sql
-- Desfazer (em caso de problema)
DROP TABLE IF EXISTS public.historico_precos CASCADE;
DROP TABLE IF EXISTS public.promocoes_vinculos CASCADE;
DROP TABLE IF EXISTS public.promocoes CASCADE;
DROP TABLE IF EXISTS public.modulos_avulsos CASCADE;
DROP TABLE IF EXISTS public.planos CASCADE;
```

---

## Resumo Executivo

**Esta implementação permite:**

1. ✅ Alterar preços sem deploy (mudança no banco reflete imediatamente)
2. ✅ Criar promoções temporárias com badge visual flutuante
3. ✅ Histórico completo de alterações (quem, quando, por que)
4. ✅ Validações de segurança (impede reduções drásticas sem motivo)
5. ✅ Preview visual antes de aplicar mudanças
6. ✅ Zero impacto no Asaas ou webhook existente

**Investimento:** 4-6 horas de desenvolvimento
**ROI:** Elimina necessidade de deploy para mudanças de preço, permite promoções dinâmicas

---

**Status:** Documentação completa, aguardando aprovação para implementação.

**Responsável:** A definir
**Data de início:** A definir
**Prioridade:** Alta (melhoria operacional significativa)
