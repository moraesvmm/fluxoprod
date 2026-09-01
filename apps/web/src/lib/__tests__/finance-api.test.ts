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
const mockRpc = vi.fn()
const mockSupabase: any = {
  rpc: mockRpc,
}

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('Finance API (api.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: {}, error: null })
  })

  describe('Fluxo de Caixa', () => {
    it('deve listar lançamentos financeiros', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ id: 'f1', tipo: 'receita', valor: 1000, status: 'pago' }],
        error: null,
      })

      const result = await fetchFinanceiro('filial-1')
      expect(mockRpc).toHaveBeenCalledWith('tenant_listar_financeiro_filial', { p_filial_id: 'filial-1' })
      expect(result).toHaveLength(1)
      expect(result[0].tipo).toBe('receita')
    })

    it('deve criar um lançamento financeiro', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { financeiro_id: 'f-new-123' },
        error: null,
      })

      const payload = {
        filial_id: 'filial-1',
        tipo: 'despesa',
        descricao: 'Aluguel',
        valor: 2500,
        data_vencimento: '2026-06-01',
        status: 'pendente',
        categoria: 'infraestrutura'
      }

      const result = await createFinanceiro(payload)
      expect(mockRpc).toHaveBeenCalledWith('tenant_criar_financeiro_filial', expect.objectContaining({
        p_filial_id: 'filial-1',
        p_descricao: 'Aluguel',
        p_valor: 2500
      }))
      expect(result.id).toBe('f-new-123')
    })
  })

  describe('Comissões', () => {
    it('deve listar comissões de colaboradores', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ id: 'c1', colaborador_id: 'u1', valor_comissao: 150 }],
        error: null,
      })

      const result = await fetchComissoes()
      expect(mockRpc).toHaveBeenCalledWith('tenant_listar_comissoes')
      expect(result).toHaveLength(1)
    })

    it('deve atualizar o status de pagamento de uma comissão', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { id: 'c1', status_pagamento: 'pago' },
        error: null,
      })

      const result = await updateComissao('c1', { status_pagamento: 'pago', data_pagamento: '2026-05-06' })
      expect(mockRpc).toHaveBeenCalledWith('tenant_atualizar_comissao', expect.objectContaining({
        p_comissao_id: 'c1',
        p_status_pagamento: 'pago'
      }))
      expect(result.status_pagamento).toBe('pago')
    })
  })

  describe('Relatórios e DRE', () => {
    it('deve obter dados do DRE por período', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { faturamento: 50000, lucro_liquido: 12000 },
        error: null,
      })

      const result = await fetchDRE('2026-01-01', '2026-01-31')
      expect(mockRpc).toHaveBeenCalledWith('tenant_obter_dre', {
        p_data_inicio: '2026-01-01',
        p_data_fim: '2026-01-31'
      })
      expect(result.faturamento).toBe(50000)
    })
  })

  describe('Cupons e Descontos', () => {
    it('deve validar um cupom de desconto', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { id: 'cp1', codigo: 'PROMO10', tipo: 'percentual', valor: 10 },
        error: null,
      })

      const result = await validarCupom('PROMO10')
      expect(mockRpc).toHaveBeenCalledWith('validar_cupom', {
        p_codigo: 'PROMO10'
      })
      expect(result.valor).toBe(10)
    })

    it('deve lançar erro para cupom inválido', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { error: 'Cupom expirado' },
        error: null,
      })

      await expect(validarCupom('EXPIRADO')).rejects.toThrow('Cupom expirado')
    })
  })
})
