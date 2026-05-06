import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  fetchObras, 
  createObra, 
  fetchObraEtapas, 
  createObraEtapa,
  fetchObraProgresso,
  fetchObraCustos,
  createObraCusto,
  fetchObraResumoFinanceiro,
  alocarRecursoObra
} from '../api'

// Mock Supabase Client
const mockSupabase: any = {
  rpc: vi.fn(),
}

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('Construction API (api.ts - Obras)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.rpc.mockResolvedValue({ data: {}, error: null })
  })

  describe('Gestão de Obras', () => {
    it('deve listar obras ativas', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'o1', nome: 'Edifício Horizonte', status: 'em_andamento' }],
        error: null,
      })

      const result = await fetchObras()
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_listar_obras')
      expect(result).toHaveLength(1)
      expect(result[0].nome).toBe('Edifício Horizonte')
    })

    it('deve criar uma nova obra', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { obra_id: 'o-new-123' },
        error: null,
      })

      const payload = {
        nome: 'Reforma Sede',
        cliente_id: 'c1',
        orcamento: 50000,
        data_inicio: '2026-06-01'
      }

      const result = await createObra(payload)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_criar_obra', expect.objectContaining({
        p_nome: 'Reforma Sede',
        p_orcamento_total: 50000
      }))
      expect(result.id).toBe('o-new-123')
    })
  })

  describe('Etapas e Progresso', () => {
    it('deve listar etapas de uma obra', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'e1', nome: 'Fundação', status: 'concluida' }],
        error: null,
      })

      const result = await fetchObraEtapas('o1')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_listar_etapas_obra', { p_obra_id: 'o1' })
      expect(result).toHaveLength(1)
    })

    it('deve obter progresso da obra', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { total: 10, concluidas: 4, percentual: 40 },
        error: null,
      })

      const result = await fetchObraProgresso('o1')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_obras_progresso', { p_obra_id: 'o1' })
      expect(result.percentual).toBe(40)
    })
  })

  describe('Financeiro de Obras (Custos e Resumo)', () => {
    it('deve listar custos de uma obra', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'ct1', categoria: 'Material', valor_real: 500 }],
        error: null,
      })

      const result = await fetchObraCustos('o1')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_listar_custos_obra', { p_obra_id: 'o1' })
      expect(result).toHaveLength(1)
    })

    it('deve obter resumo financeiro da obra', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { orcamento_total: 100000, total_real: 45000, variacao: 55000 },
        error: null,
      })

      const result = await fetchObraResumoFinanceiro('o1')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_obras_resumo_financeiro', { p_obra_id: 'o1' })
      expect(result.total_real).toBe(45000)
    })
  })

  describe('Recursos e Materiais', () => {
    it('deve alocar recurso em uma obra', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { recurso_id: 'r1' },
        error: null,
      })

      const payload = {
        obra_id: 'o1',
        tipo: 'material' as const,
        descricao: 'Cimento',
        quantidade: 100,
        custo_unitario: 35
      }

      const result = await alocarRecursoObra(payload)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_alocar_recurso_obra', expect.objectContaining({
        p_descricao: 'Cimento',
        p_quantidade: 100
      }))
      expect(result.id).toBe('r1')
    })
  })
})
