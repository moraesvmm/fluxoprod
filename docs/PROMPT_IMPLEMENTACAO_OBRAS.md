# PROMPT DETALHADO - IMPLEMENTAÇÃO MÓDULO OBRAS COMPLETO

## CONTEXTO GERAL

**Sistema:** Fluxo ERP - Sistema multi-tenant SaaS
**Arquitetura:** Next.js 16.2.2 + React 19.2.4 + TypeScript + Supabase (PostgreSQL)
**Multi-tenancy:** Um schema PostgreSQL por tenant (ex: tenant_62a495e1)
**Schema Routing:** RPC `set_tenant_schema()` configura `search_path` baseado em `user_profiles`
**Frontend:** Apps/web/src com App Router, React Query, shadcn/ui, TailwindCSS 4
**Backend:** Supabase PostgreSQL com RPC Functions (Python não existe)
**Padrão RPC:** Todas as RPCs retornam JSONB, usam idempotency_key em escritas, Security DEFINER

**Estado atual do módulo Obras:**
- Tabela `obras` existente com: id, nome, cliente_id, endereco, data_inicio, data_fim_prevista, orcamento_total, descricao, status, criado_em, atualizado_em
- RPCs existentes: tenant_listar_obras, tenant_criar_obra, tenant_excluir_obra
- Frontend: apps/web/src/app/tenant/obras/page.tsx (CRUD básico)
- Falta: tenant_atualizar_obra, gestão de etapas, controle financeiro, recursos, documentação

**Service Role:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU

---

## OBJETIVO

Implementar funcionalidades avançadas no módulo Obras:
1. **Atualização de obras** (CRUD completo)
2. **Gestão de etapas/milestones** (timeline, progresso)
3. **Controle financeiro detalhado** (custos por obra, integração com financeiro)
4. **Gestão de recursos/alocação** (materiais, mão de obra, equipamentos)
5. **Documentação e anexos** (upload de arquivos via Supabase Storage, galeria, download)

---

## PARTE 1: ATUALIZAÇÃO DE OBRAS

### 1.1. RPC Backend (Schema Tenant)

**Arquivo:** apps/api/supabase_rpc.sql

```sql
CREATE OR REPLACE FUNCTION tenant_atualizar_obra(
  p_obra_id UUID,
  p_nome VARCHAR(255),
  p_descricao TEXT,
  p_endereco TEXT,
  p_data_inicio DATE,
  p_data_fim_prevista DATE,
  p_status VARCHAR(50),
  p_orcamento_total DECIMAL(15,2),
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public

AS $func$
DECLARE
  v_result JSONB;
  v_cached_result JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_cached_result
    FROM idempotency_control
    WHERE idempotency_key = p_idempotency_key
      AND operation_type = 'tenant_atualizar_obra';
    
    IF v_cached_result IS NOT NULL THEN
      RETURN v_cached_result;
    END IF;
  END IF;

  UPDATE obras
  SET 
    nome = p_nome,
    descricao = p_descricao,
    endereco = p_endereco,
    data_inicio = p_data_inicio,
    data_fim_prevista = p_data_fim_prevista,
    status = p_status,
    orcamento_total = p_orcamento_total,
    atualizado_em = NOW()
  WHERE id = p_obra_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Obra não encontrada');
  END IF;

  INSERT INTO audit_log (
    operation_type, resource, resource_id, user_id, details, status
  )
  VALUES (
    'UPDATE', 'obras', p_obra_id, auth.uid(), 
    jsonb_build_object('nome', p_nome, 'status', p_status),
    'success'
  );

  v_result := jsonb_build_object('success', true, 'obra_id', p_obra_id);

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO idempotency_control (idempotency_key, operation_type, result)
    VALUES (p_idempotency_key, 'tenant_atualizar_obra', v_result);
  END IF;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$func$;
```

### 1.2. RPC Public (Schema Public)

Criar RPC public seguindo padrão de roteamento existente.

### 1.3. Frontend API

**Arquivo:** apps/web/src/lib/api.ts

```typescript
export async function updateObra(obraId: string, obra: ObraUpdate): Promise<Obra> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_obra', {
      p_obra_id: obraId,
      p_nome: obra.nome,
      p_descricao: obra.descricao,
      p_endereco: obra.endereco,
      p_data_inicio: obra.data_inicio,
      p_data_fim_prevista: obra.data_fim_prevista,
      p_status: obra.status,
      p_orcamento_total: obra.orcamento_total,
    });
  
  if (error) throw new Error(error.message);
  return { id: obraId, ...obra } as Obra;
}
```

### 1.4. Frontend Hook

**Arquivo:** apps/web/src/lib/hooks/use-obras.ts

```typescript
export function useUpdateObra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ obraId, obra }: { obraId: string; obra: ObraUpdate }) => 
      updateObra(obraId, obra),
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_KEY }),
  });
}
```

---

## PARTE 2: GESTÃO DE ETAPAS/MILESTONES

### 2.1. Tabela de Banco de Dados (Schema Tenant)

```sql
CREATE TABLE IF NOT EXISTS obras_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_prevista DATE NOT NULL,
  data_conclusao DATE,
  status VARCHAR(50) DEFAULT 'pendente',
  ordem INTEGER NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obras_etapas_obra ON obras_etapas(obra_id);
CREATE INDEX IF NOT EXISTS idx_obras_etapas_status ON obras_etapas(status);
CREATE INDEX IF NOT EXISTS idx_obras_etapas_ordem ON obras_etapas(obra_id, ordem);

CREATE TRIGGER trg_atualizar_obras_etapas
BEFORE UPDATE ON obras_etapas
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_obras_etapas();
```

### 2.2. RPCs Backend (Schema Tenant)

**RPCs necessárias:**
- `tenant_criar_etapa_obra` - Criar etapa com idempotência
- `tenant_listar_etapas_obra` - Listar etapas por obra
- `tenant_atualizar_etapa_obra` - Atualizar etapa
- `tenant_excluir_etapa_obra` - Excluir etapa
- `tenant_obras_progresso` - Calcular progresso (total, concluídas, em andamento, pendentes, percentual)

### 2.3. Frontend

**Arquivos:**
- apps/web/src/lib/api.ts - Funções API (createObraEtapa, fetchObraEtapas, updateObraEtapa, deleteObraEtapa, fetchObraProgresso)
- apps/web/src/lib/hooks/use-obras-etapas.ts - Hooks React Query
- apps/web/src/components/modules/obras/EtapasTimeline.tsx - Componente timeline visual

---

## PARTE 3: CONTROLE FINANCEIRO DETALHADO

### 3.1. Tabela de Banco de Dados (Schema Tenant)

```sql
CREATE TABLE IF NOT EXISTS obras_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  categoria VARCHAR(100) NOT NULL,
  descricao TEXT,
  valor_previsto DECIMAL(15,2) NOT NULL,
  valor_real DECIMAL(15,2),
  data DATE NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  fornecedor_id UUID REFERENCES clientes(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obras_custos_obra ON obras_custos(obra_id);
CREATE INDEX IF NOT EXISTS idx_obras_custos_categoria ON obras_custos(categoria);
CREATE INDEX IF NOT EXISTS idx_obras_custos_tipo ON obras_custos(tipo);
```

### 3.2. RPCs Backend (Schema Tenant)

**RPCs necessárias:**
- `tenant_criar_custo_obra` - Criar custo
- `tenant_listar_custos_obra` - Listar custos por obra
- `tenant_atualizar_custo_obra` - Atualizar custo (incluindo valor_real)
- `tenant_excluir_custo_obra` - Excluir custo
- `tenant_obras_resumo_financeiro` - Resumo financeiro (orçamento, total previsto, total real, variação, % orçamento utilizado)

### 3.3. Frontend

**Arquivos:**
- apps/web/src/lib/api.ts - Funções API
- apps/web/src/lib/hooks/use-obras-custos.ts - Hooks React Query
- apps/web/src/components/modules/obras/FinanceiroDashboard.tsx - Dashboard financeiro visual

---

## PARTE 4: GESTÃO DE RECURSOS/ALOCAÇÃO

### 4.1. Tabela de Banco de Dados (Schema Tenant)

```sql
CREATE TABLE IF NOT EXISTS obras_recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL,
  quantidade DECIMAL(10,2) NOT NULL,
  unidade VARCHAR(20) DEFAULT 'un',
  custo_unitario DECIMAL(15,2) NOT NULL,
  custo_total DECIMAL(15,2) GENERATED ALWAYS AS (quantidade * custo_unitario) STORED,
  status VARCHAR(50) DEFAULT 'alocado',
  data_alocacao DATE DEFAULT CURRENT_DATE,
  fornecedor_id UUID REFERENCES clientes(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obras_recursos_obra ON obras_recursos(obra_id);
CREATE INDEX IF NOT EXISTS idx_obras_recursos_tipo ON obras_recursos(tipo);
CREATE INDEX IF NOT EXISTS idx_obras_recursos_status ON obras_recursos(status);
```

### 4.2. RPCs Backend (Schema Tenant)

**RPCs necessárias:**
- `tenant_alocar_recurso_obra` - Alocar recurso
- `tenant_listar_recursos_obra` - Listar recursos por obra
- `tenant_atualizar_recurso_obra` - Atualizar recurso
- `tenant_excluir_recurso_obra` - Excluir recurso

### 4.3. Frontend

**Arquivos:**
- apps/web/src/lib/api.ts - Funções API
- apps/web/src/lib/hooks/use-obras-recursos.ts - Hooks React Query

---

## PARTE 5: DOCUMENTAÇÃO E ANEXOS

### 5.1. Configuração Supabase Storage

**Bucket:** `obras-documentos`

**SQL para criar bucket e políticas:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('obras-documentos', 'obras-documentos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view documents from their tenant"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'obras-documentos'
  AND (
    SELECT schema_name
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid()
  ) = split_part(name, '/', 1)
);

CREATE POLICY "Users can upload documents to their tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'obras-documentos'
  AND (
    SELECT schema_name
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid()
  ) = split_part(name, '/', 1)
);

CREATE POLICY "Users can update documents from their tenant"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'obras-documentos'
  AND (
    SELECT schema_name
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid()
  ) = split_part(name, '/', 1)
);

CREATE POLICY "Users can delete documents from their tenant"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'obras-documentos'
  AND (
    SELECT schema_name
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid()
  ) = split_part(name, '/', 1)
);
```

### 5.2. Tabela de Banco de Dados (Schema Tenant)

```sql
CREATE TABLE IF NOT EXISTS obras_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  tamanho BIGINT NOT NULL,
  url TEXT NOT NULL,
  caminho_storage TEXT NOT NULL,
  descricao TEXT,
  criado_por UUID REFERENCES clientes(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obras_documentos_obra ON obras_documentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_obras_documentos_tipo ON obras_documentos(tipo);
```

### 5.3. RPCs Backend (Schema Tenant)

**RPCs necessárias:**
- `tenant_upload_documento_obra` - Registrar documento após upload
- `tenant_listar_documentos_obra` - Listar documentos por obra
- `tenant_excluir_documento_obra` - Excluir documento (retorna caminho para exclusão do storage)

### 5.4. Frontend Upload

**Arquivo:** apps/web/src/lib/api.ts

```typescript
export async function uploadObraDocumento(
  file: File,
  obraId: string,
  descricao?: string
): Promise<ObraDocumento> {
  const supabase = getSupabase();
  
  // Obter schema do tenant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('empresa_id')
    .eq('user_id', user.id)
    .single();
  
  if (!profile) throw new Error('Perfil não encontrado');
  
  const { data: empresa } = await supabase
    .from('empresas')
    .select('schema_name')
    .eq('id', profile.empresa_id)
    .single();
  
  if (!empresa) throw new Error('Empresa não encontrada');
  
  const schemaName = empresa.schema_name;
  
  // Gerar caminho único no storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const caminhoStorage = `${schemaName}/${obraId}/${fileName}`;
  
  // Upload para Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('obras-documentos')
    .upload(caminhoStorage, file);
  
  if (uploadError) throw new Error(uploadError.message);
  
  // Obter URL pública
  const { data: { publicUrl } } = supabase
    .storage
    .from('obras-documentos')
    .getPublicUrl(caminhoStorage);
  
  // Registrar no banco via RPC
  const { data, error } = await supabase
    .rpc('tenant_upload_documento_obra', {
      p_obra_id: obraId,
      p_nome: file.name,
      p_tipo: file.type,
      p_tamanho: file.size,
      p_url: publicUrl,
      p_caminho_storage: caminhoStorage,
      p_descricao: descricao,
      p_criado_por: user.id,
    });
  
  if (error) throw new Error(error.message);
  
  return {
    id: data?.documento_id,
    obra_id: obraId,
    nome: file.name,
    tipo: file.type,
    tamanho: file.size,
    url: publicUrl,
    caminho_storage: caminhoStorage,
    descricao,
    criado_por: user.id,
    criado_em: new Date().toISOString(),
  } as ObraDocumento;
}

export async function deleteObraDocumento(documentoId: string): Promise<void> {
  const supabase = getSupabase();
  
  // Excluir do banco e obter caminho
  const { data, error } = await supabase
    .rpc('tenant_excluir_documento_obra', { p_documento_id: documentoId });
  
  if (error) throw new Error(error.message);
  
  // Excluir do storage
  if (data?.caminho_storage) {
    const { error: storageError } = await supabase
      .storage
      .from('obras-documentos')
      .remove([data.caminho_storage]);
    
    if (storageError) console.error('Erro ao excluir do storage:', storageError);
  }
}
```

### 5.5. Frontend Hooks

**Arquivo:** apps/web/src/lib/hooks/use-obras-documentos.ts (novo arquivo)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

const OBRAS_DOCUMENTOS_KEY = ['obras_documentos'];

export function useObraDocumentos(obraId: string) {
  return useQuery({
    queryKey: [...OBRAS_DOCUMENTOS_KEY, obraId],
    queryFn: () => api.fetchObraDocumentos(obraId),
    enabled: !!obraId,
  });
}

export function useUploadObraDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.uploadObraDocumento,
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_DOCUMENTOS_KEY }),
  });
}

export function useDeleteObraDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteObraDocumento,
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_DOCUMENTOS_KEY }),
  });
}
```

### 5.6. Frontend Componente

**Arquivo:** apps/web/src/components/modules/obras/DocumentosGaleria.tsx (novo arquivo)

```typescript
'use client';

import { ObraDocumento } from '@/lib/api';
import { formatBytes } from '@/lib/utils/format';

interface DocumentosGaleriaProps {
  documentos: ObraDocumento[];
  onUpload?: (file: File, descricao?: string) => Promise<void>;
  onDelete?: (documentoId: string) => Promise<void>;
  onDownload?: (documento: ObraDocumento) => void;
}

export function DocumentosGaleria({ documentos, onUpload, onDelete, onDownload }: DocumentosGaleriaProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    
    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de arquivo não permitido.');
      return;
    }
    
    const descricao = prompt('Descrição do documento (opcional):');
    await onUpload(file, descricao || undefined);
  };

  return (
    <div className="space-y-4">
      {/* Upload */}
      {onUpload && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Documento
          </label>
          <p className="text-sm text-gray-500 mt-2">
            JPG, PNG, GIF, PDF, DOC, DOCX (máx. 10MB)
          </p>
        </div>
      )}
      
      {/* Galeria */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentos.map((doc) => (
          <div key={doc.id} className="bg-white rounded-lg shadow p-4 border">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{doc.nome}</h4>
                {doc.descricao && (
                  <p className="text-sm text-gray-500 truncate">{doc.descricao}</p>
                )}
              </div>
              <div className="flex gap-2 ml-2">
                {onDownload && (
                  <button
                    onClick={() => onDownload(doc)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Excluir"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Preview para imagens */}
            {doc.tipo.startsWith('image/') && (
              <div className="mt-2">
                <img
                  src={doc.url}
                  alt={doc.nome}
                  className="w-full h-32 object-cover rounded"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{formatBytes(doc.tamanho)}</span>
              <span>{new Date(doc.criado_em).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## PARTE 6: INTEGRAÇÃO NA PÁGINA DE OBRAS

### 6.1. Atualizar Página Principal

**Arquivo:** apps/web/src/app/tenant/obras/page.tsx

Adicionar abas/seções para:
1. Detalhes da obra (com formulário de edição)
2. Etapas/Milestones (timeline)
3. Financeiro (dashboard de custos)
4. Recursos (tabela de alocação)
5. Documentos (galeria)

### 6.2. Layout Sugerido

```typescript
'use client';

import { useState } from 'react';
import { Obra } from '@/lib/api';
import { EtapasTimeline } from '@/components/modules/obras/EtapasTimeline';
import { FinanceiroDashboard } from '@/components/modules/obras/FinanceiroDashboard';
import { DocumentosGaleria } from '@/components/modules/obras/DocumentosGaleria';

type Tab = 'detalhes' | 'etapas' | 'financeiro' | 'recursos' | 'documentos';

export default function ObrasPage() {
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('detalhes');

  return (
    <div className="space-y-6">
      {/* Lista de obras */}
      {/* ... código existente ... */}
      
      {/* Detalhes da obra selecionada */}
      {selectedObra && (
        <div className="bg-white rounded-lg shadow">
          {/* Tabs */}
          <div className="border-b">
            <nav className="flex space-x-4 px-4">
              {['detalhes', 'etapas', 'financeiro', 'recursos', 'documentos'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as Tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Conteúdo das tabs */}
          <div className="p-4">
            {activeTab === 'detalhes' && (
              <div>{/* Formulário de edição de obra */}</div>
            )}
            {activeTab === 'etapas' && (
              <EtapasTimeline etapas={etapas} onEdit={onEditEtapa} onDelete={onDeleteEtapa} />
            )}
            {activeTab === 'financeiro' && (
              <FinanceiroDashboard resumo={resumoFinanceiro} />
            )}
            {activeTab === 'recursos' && (
              <div>{/* Tabela de recursos */}</div>
            )}
            {activeTab === 'documentos' && (
              <DocumentosGaleria documentos={documentos} onUpload={onUpload} onDelete={onDelete} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## REQUISITOS DE IMPLEMENTAÇÃO

### Ordem de Implementação

1. **Fase 1: Atualização de Obras**
   - Criar RPC tenant_atualizar_obra
   - Criar RPC public equivalente
   - Adicionar função API
   - Adicionar hook useUpdateObra
   - Atualizar UI com formulário de edição

2. **Fase 2: Gestão de Etapas**
   - Criar tabela obras_etapas
   - Criar RPCs de etapas
   - Criar RPCs public equivalentes
   - Adicionar funções API
   - Criar hooks use-obras-etapas.ts
   - Criar componente EtapasTimeline.tsx
   - Integrar na página de obras

3. **Fase 3: Controle Financeiro**
   - Criar tabela obras_custos
   - Criar RPCs financeiras
   - Criar RPCs public equivalentes
   - Adicionar funções API
   - Criar hooks use-obras-custos.ts
   - Criar componente FinanceiroDashboard.tsx
   - Integrar na página de obras

4. **Fase 4: Gestão de Recursos**
   - Criar tabela obras_recursos
   - Criar RPCs de recursos
   - Criar RPCs public equivalentes
   - Adicionar funções API
   - Criar hooks use-obras-recursos.ts
   - Criar tabela de recursos na UI
   - Integrar na página de obras

5. **Fase 5: Documentação**
   - Criar bucket obras-documentos no Supabase Storage
   - Configurar políticas RLS
   - Criar tabela obras_documentos
   - Criar RPCs de documentos
   - Criar RPCs public equivalentes
   - Adicionar funções API (upload, download, delete)
   - Criar hooks use-obras-documentos.ts
   - Criar componente DocumentosGaleria.tsx
   - Integrar na página de obras

### Padrões a Seguir

- **Todas as RPCs:** Retornam JSONB, usam idempotency_key em escritas, Security DEFINER
- **Todas as tabelas:** Criar índices apropriados, triggers para atualizar atualizado_em
- **Frontend:** Usar React Query para cache, TypeScript estrito, componentes reutilizáveis
- **Upload de arquivos:** Validar tipo e tamanho, gerar caminho único com schema/obra_id, usar Supabase Storage
- **UI:** Usar shadcn/ui, TailwindCSS 4, design consistente com o resto do sistema

### Validações

- **Etapa:** data_prevista obrigatória, ordem obrigatória
- **Custo:** valor_previsto obrigatório, data obrigatória
- **Recurso:** quantidade obrigatória, custo_unitario obrigatório
- **Documento:** tamanho máximo 10MB, tipos permitidos (jpg, png, gif, pdf, doc, docx)

### Testes

- Testar upload de arquivos de diferentes tipos e tamanhos
- Testar exclusão de documentos (verificar se arquivo é removido do storage)
- Testar cálculo de progresso de etapas
- Testar cálculo de resumo financeiro
- Testar atualização de custo com valor_real

---

## CONSIDERAÇÕES IMPORTANTES

1. **Multi-tenancy:** Todas as operações devem respeitar o schema do tenant atual
2. **Segurança:** Usar service_role apenas para operações administrativas, validar RLS no Storage
3. **Performance:** Criar índices em todas as tabelas novas, usar LIMIT padrão 1000
4. **Idempotência:** Todas as RPCs de escrita devem suportar idempotency_key
5. **Audit Log:** Registrar todas as operações em audit_log
6. **Error Handling:** Tratar exceções em todas as RPCs, retornar erro em JSONB
7. **Frontend:** Usar React Query para cache e invalidação automática
8. **Upload:** Validar arquivos no frontend e backend, usar caminhos únicos

---

## SERVICE ROLE PARA OPERAÇÕES ADMINISTRATIVAS

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU
```

---

## ARQUIVOS A CRIAR/MODIFICAR

### SQL
- apps/api/supabase_rpc.sql (adicionar tabelas e RPCs)

### Frontend API
- apps/web/src/lib/api.ts (adicionar funções)

### Frontend Hooks
- apps/web/src/lib/hooks/use-obras.ts (atualizar)
- apps/web/src/lib/hooks/use-obras-etapas.ts (novo)
- apps/web/src/lib/hooks/use-obras-custos.ts (novo)
- apps/web/src/lib/hooks/use-obras-recursos.ts (novo)
- apps/web/src/lib/hooks/use-obras-documentos.ts (novo)

### Frontend Componentes
- apps/web/src/components/modules/obras/EtapasTimeline.tsx (novo)
- apps/web/src/components/modules/obras/FinanceiroDashboard.tsx (novo)
- apps/web/src/components/modules/obras/DocumentosGaleria.tsx (novo)

### Frontend Páginas
- apps/web/src/app/tenant/obras/page.tsx (atualizar com tabs)

### Utilitários
- apps/web/src/lib/utils/format.ts (adicionar formatBytes se não existir)

---

Este prompt fornece todas as especificações necessárias para implementar as funcionalidades avançadas do módulo Obras seguindo os padrões existentes do sistema.
