import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  createCliente, 
  updateCliente, 
  fetchClientes, 
  createInteracao,
  adicionarTag,
  listarTagsCatalog,
  enviarCampanhaMassa,
  obterSugestoesNurturing
} from '../api'

// Mock Supabase Client
const mockSupabase: any = {
  rpc: vi.fn(),
}

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('CRM API (api.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset rpc mock to resolve successfully by default
    mockSupabase.rpc.mockResolvedValue({ data: {}, error: null })
  })

  describe('Clientes', () => {
    it('deve criar um cliente com parâmetros corretos', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { cliente_id: 'new-client-123' },
        error: null,
      })

      const payload = {
        nome: 'Empresa Teste',
        email: 'teste@empresa.com',
        telefone: '11999999999',
        cpf_cnpj: '12.345.678/0001-99',
      }

      const result = await createCliente(payload)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_criar_cliente', expect.objectContaining({
        p_nome: payload.nome,
        p_email: payload.email,
        p_telefone: payload.telefone,
      }))
      expect(result.id).toBe('new-client-123')
    })

    it('deve atualizar um cliente', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { id: 'client-123', nome: 'Novo Nome' },
        error: null,
      })

      const result = await updateCliente('client-123', { nome: 'Novo Nome' })
      expect(result.nome).toBe('Novo Nome')
    })

    it('deve listar clientes e processar cursor', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: '1', nome: 'C1', next_cursor: 'next' }],
        error: null,
      })

      const result = await fetchClientes({ limit: 1 })
      expect(result.data).toHaveLength(1)
      expect(result.next_cursor).toBe('next')
    })
  })

  describe('Interações', () => {
    it('deve criar uma interação para o cliente', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { interacao_id: 'int-123' },
        error: null,
      })

      const result = await createInteracao({
        cliente_id: 'c1',
        tipo: 'ligacao',
        titulo: 'Teste'
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('tenant_criar_interacao', expect.objectContaining({
        p_tipo: 'ligacao'
      }))
      expect(result.id).toBe('int-123')
    })
  })

  describe('Tags', () => {
    it('deve adicionar uma tag', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })

      const result = await adicionarTag('c1', 'VIP')
      expect(result.success).toBe(true)
    })

    it('deve listar o catálogo de tags', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: '1', nome: 'VIP' }],
        error: null,
      })

      const result = await listarTagsCatalog('V')
      expect(result).toHaveLength(1)
    })
  })

  describe('Nurturing e Campanhas', () => {
    it('deve enviar campanha em massa', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { success: true, enviados: 5 },
        error: null,
      })

      const result = await enviarCampanhaMassa(['1'], 'T', 'M')
      expect(result.enviados).toBe(5)
    })

    it('deve obter sugestões de nurturing', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'a1' }],
        error: null,
      })

      const result = await obterSugestoesNurturing()
      expect(result).toHaveLength(1)
    })
  })
})
