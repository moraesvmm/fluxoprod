import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  fetchProdutos, 
  createProduto, 
  verificarAlertasEstoque, 
  criarKit, 
  criarTransferencia, 
  concluirTransferencia,
  calcularValorEstoque,
  gerarCodigoBarras
} from '../api'

import type { Produto, Kit, TransferenciaEstoque } from '../api'

// Mock Supabase Client
const mockRpc = vi.fn()
const mockSupabase: any = {
  rpc: mockRpc,
}

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('Inventory API (api.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: {}, error: null })
  })

  describe('Produtos', () => {
    it('deve listar produtos', async () => {
      const mockData: Partial<Produto>[] = [{ id: 'p1', nome: 'Produto 1', estoque_atual: 10 }]
      mockRpc.mockResolvedValueOnce({
        data: mockData,
        error: null,
      })

      const result = await fetchProdutos()
      expect(mockRpc).toHaveBeenCalledWith('tenant_listar_produtos')
      expect(result).toHaveLength(1)
      expect(result[0].nome).toBe('Produto 1')
    })

    it('deve criar um produto', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { produto_id: 'p-new-123' },
        error: null,
      })

      const payload = {
        nome: 'Novo Martelo',
        sku: 'MART-001',
        preco_venda: 45.90,
        estoque_atual: 50,
      }

      const result = await createProduto(payload)
      expect(mockRpc).toHaveBeenCalledWith('tenant_criar_produto', expect.objectContaining({
        p_nome: payload.nome,
        p_sku: payload.sku,
      }))
      expect(result.id).toBe('p-new-123')
    })
  })

  describe('Alertas e Kits', () => {
    it('deve verificar e gerar alertas de estoque', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, alertas_criados: 3 },
        error: null,
      })

      const result = await verificarAlertasEstoque()
      expect(mockRpc).toHaveBeenCalledWith('tenant_verificar_alertas_estoque')
      expect(result.alertas_criados).toBe(3)
    })

    it('deve criar um kit de produtos', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { kit_id: 'kit-123' },
        error: null,
      })

      const payload = {
        produto_id: 'p-master',
        nome: 'Combo Ferramentas',
        itens: [{ produto_id: 'p1', quantidade: 2 }, { produto_id: 'p2', quantidade: 1 }]
      }

      const result = await criarKit(payload)
      expect(mockRpc).toHaveBeenCalledWith('tenant_criar_kit', expect.objectContaining({
        p_nome: payload.nome,
        p_itens: payload.itens
      }))
      expect(result.kit_id).toBe('kit-123')
    })
  })

  describe('Movimentações e Transferências', () => {
    it('deve criar uma transferência entre locais', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { transferencia_id: 'tr-123' },
        error: null,
      })

      const payload = {
        produto_id: 'p1',
        local_origem_id: 'loc-1',
        local_destino_id: 'loc-2',
        quantidade: 10,
        criado_por: 'user-1'
      }

      const result = await criarTransferencia(payload)
      expect(mockRpc).toHaveBeenCalledWith('tenant_criar_transferencia', expect.objectContaining({
        p_quantidade: 10
      }))
      expect(result.transferencia_id).toBe('tr-123')
    })

    it('deve concluir uma transferência', async () => {
      await concluirTransferencia('tr-123')
      expect(mockRpc).toHaveBeenCalledWith('tenant_concluir_transferencia', {
        p_transferencia_id: 'tr-123'
      })
    })
  })

  describe('Valoração e Códigos', () => {
    it('deve calcular o valor total do estoque', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { valor_total: 15000.50, metodo: 'custo_medio' },
        error: null,
      })

      const result = await calcularValorEstoque('custo_medio')
      expect(mockRpc).toHaveBeenCalledWith('tenant_calcular_valor_estoque', {
        p_metodo: 'custo_medio'
      })
      expect(result.valor_total).toBe(15000.50)
    })

    it('deve gerar código de barras para um produto', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, codigo_barras: '7891234567890' },
        error: null,
      })

      const result = await gerarCodigoBarras('p1')
      expect(mockRpc).toHaveBeenCalledWith('tenant_gerar_codigo_barras', {
        p_produto_id: 'p1'
      })
      expect(result.codigo_barras).toBe('7891234567890')
    })
  })
})
