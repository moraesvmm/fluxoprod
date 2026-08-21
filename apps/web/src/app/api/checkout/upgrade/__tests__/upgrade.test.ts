import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, type UpgradePayload } from '../route'
import { PaymentGatewayService } from '@/services/PaymentGatewayService'

vi.mock('server-only', () => ({}))

// Mock de uma cadeia de banco de dados (QueryBuilder)
const mockDbChain: any = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() => Promise.resolve({ data: {}, error: null })),
  maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  then: vi.fn(),
}

const mockSupabase: any = {
  auth: {
    admin: {
      getUserById: vi.fn(),
    },
  },
  from: vi.fn().mockReturnValue(mockDbChain),
}

// Mocking dependencies
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/services/PaymentGatewayService', () => ({
  PaymentGatewayService: {
    createTransaction: vi.fn(),
  },
}))

describe('Upgrade/Checkout API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default success mocks
    mockSupabase.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: 'admin@teste.com' } }
    })

    // Mock genérico para .then() que sempre resolve para um array vazio em 'data'
    // Isso evita "map is not a function" se não mockarmos especificamente.
    mockDbChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }))
  })

  it('deve atualizar módulos e gerar link de pagamento com sucesso', async () => {
    // 1. Mock buscar empresa (single)
    mockDbChain.single.mockResolvedValueOnce({
      data: { id: 'emp-123', razao_social: 'Minha Empresa', plan_name: 'Starter' },
      error: null,
    })

    // 2. Mock a sequência de chamadas 'maybeSingle'
    // Chamada 1: planoInfo
    mockDbChain.maybeSingle.mockResolvedValueOnce({
      data: { preco: 299.90, preco_promocional: 249.00, modulos_incluidos: ['crm'] },
      error: null,
    })
    // Chamada 2: perfil do administrador da empresa
    mockDbChain.maybeSingle.mockResolvedValueOnce({
      data: { user_id: 'user-123', nome: 'Admin' },
      error: null,
    })

    // 3. Mock a sequência de chamadas 'thenable' (sem terminal)
    let thenCall = 0;
    mockDbChain.then.mockImplementation((resolve: any) => {
      thenCall++;
      // Await 1: update(empresa_modulos) reset -> {}
      // Await 2: insert(crm) -> {}
      // Await 3: insert(estoque) -> {}
      
      if (thenCall === 4) { // Await 4: select(modulosAtivos) -> [crm, estoque]
        return resolve({
          data: [{ modulo_key: 'crm' }, { modulo_key: 'estoque' }],
          error: null,
        })
      }
      
      if (thenCall === 5) { // Await 5: select(modulos extras info) -> [estoque info]
        return resolve({
          data: [{ key: 'estoque', preco: 50.00 }],
          error: null,
        })
      }

      return resolve({ data: [], error: null })
    })

    // 4. Mock Gateway
    ;(PaymentGatewayService.createTransaction as any).mockResolvedValue({
      success: true,
      redirectUrl: 'https://asaas.com/p/link-de-pagamento',
    })

    const payloadRequest: UpgradePayload = {
      empresaId: 'emp-123',
      modules: ['crm', 'estoque'],
    }

    const request = new Request('http://localhost/api/checkout/upgrade', {
      method: 'POST',
      body: JSON.stringify(payloadRequest),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.redirectUrl).toBe('https://asaas.com/p/link-de-pagamento')

    expect(PaymentGatewayService.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 299,
        customerEmail: 'admin@teste.com'
      })
    )
  })
})
