import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  fetchFinanceiro, 
  createFinanceiro, 
  fetchComissoes, 
  updateComissao,
  fetchDRE,
  validarCupom
} from '../api'

// Mock Supabase Client
const mockSupabase: any = {
  rpc: vi.fn(),
}

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('Finance API (api.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.rpc.mockResolvedValue({ data: {}, error: null })
  })

  describe('Fluxo de Caixa', () => {
    it('deve listar lançamentos financeiros', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'f1', tipo: 'receita', valor: 1000, status: 'pago' }],
        error: null,
      })

      const result = await fetchFinanceiro()
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_listar_financeiro')
      expect(result).toHaveLength(1)
      expect(result[0].tipo).toBe('receita')
    })

    it('deve criar um lançamento financeiro', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { financeiro_id: 'f-new-123' },
        error: null,
      })

      const payload = {
        tipo: 'despesa',
        descricao: 'Aluguel',
        valor: 2500,
        data_vencimento: '2026-06-01',
        status: 'pendente',
        categoria: 'infraestrutura'
      }

      const result = await createFinanceiro(payload)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_criar_financeiro', expect.objectContaining({
        p_descricao: 'Aluguel',
        p_valor: 2500
      }))
      expect(result.id).toBe('f-new-123')
    })
  })

  describe('Comissões', () => {
    it('deve listar comissões de colaboradores', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'c1', colaborador_id: 'u1', valor_comissao: 150 }],
        error: null,
      })

      const result = await fetchComissoes()
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_listar_comissoes')
      expect(result).toHaveLength(1)
    })

    it('deve atualizar o status de pagamento de uma comissão', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { id: 'c1', status_pagamento: 'pago' },
        error: null,
      })

      const result = await updateComissao('c1', { status_pagamento: 'pago', data_pagamento: '2026-05-06' })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_atualizar_comissao', expect.objectContaining({
        p_comissao_id: 'c1',
        p_status_pagamento: 'pago'
      }))
      expect(result.status_pagamento).toBe('pago')
    })
  })

  describe('Relatórios e DRE', () => {
    it('deve obter dados do DRE por período', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { faturamento: 50000, lucro_liquido: 12000 },
        error: null,
      })

      const result = await fetchDRE('2026-01-01', '2026-01-31')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_obter_dre', {
        p_data_inicio: '2026-01-01',
        p_data_fim: '2026-01-31'
      })
      expect(result.faturamento).toBe(50000)
    })
  })

  describe('Cupons e Descontos', () => {
    it('deve validar um cupom de desconto', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { id: 'cp1', codigo: 'PROMO10', tipo: 'percentual', valor: 10 },
        error: null,
      })

      const result = await validarCupom('PROMO10')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('validar_cupom', {
        p_codigo: 'PROMO10'
      })
      expect(result.valor).toBe(10)
    })

    it('deve lançar erro para cupom inválido', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { error: 'Cupom expirado' },
        error: null,
      })

      await expect(validarCupom('EXPIRADO')).rejects.toThrow('Cupom expirado')
    })
  })
})
