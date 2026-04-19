-- Migration: Adicionar campo nome em user_profiles
-- Execute este script no Supabase SQL Editor com SERVICE_ROLE
-- Esta migration é idempotente e pode ser executada múltiplas vezes

-- Adicionar coluna nome opcional em user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS nome TEXT;
