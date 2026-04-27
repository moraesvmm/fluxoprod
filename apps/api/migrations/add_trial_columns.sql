-- Adiciona colunas para o Trial
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255);

-- Atualiza restrição (se existir) na coluna subscription_status ou apenas permite 'TRIAL'
-- Como a coluna subscription_status é VARCHAR e muitas vezes não tem CHECK constraint, 
-- vamos garantir que a coluna exista.
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'INACTIVE';

-- Para empresas existentes que estão ATIVAS mas sem data de trial e com status de subscription_status,
-- vamos mantê-las como estão (elas não estão em trial).

