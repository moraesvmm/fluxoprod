import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, type TrialRegistrationPayload } from '../route'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email'

// Mock de uma cadeia de banco de dados (QueryBuilder)
const mockDbChain: any = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() => Promise.resolve({ data: {}, error: null })),
  maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  then: vi.fn().mockImplementation((resolve: any) => resolve({ data: {}, error: null })),
}

const mockAdmin: any = {
  auth: {
    admin: {
      createUser: vi.fn(),
      generateLink: vi.fn(),
      deleteUser: vi.fn(),
      listUsers: vi.fn(),
    },
  },
  from: vi.fn().mockReturnValue(mockDbChain),
  rpc: vi.fn(),
}

// Mocking dependencies
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid'),
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}))

vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
}))

describe('Register Trial API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default success mocks
    mockAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    mockAdmin.auth.admin.generateLink.mockResolvedValue({ data: { properties: { action_link: 'http://activate.me' } }, error: null })
    mockAdmin.auth.admin.deleteUser.mockResolvedValue({ data: {}, error: null })
    mockAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
    mockAdmin.rpc.mockResolvedValue({ data: { status: 'success' }, error: null })
    mockDbChain.maybeSingle.mockResolvedValue({ data: null, error: null })
    mockDbChain.then.mockImplementation((resolve: any) => resolve({ data: {}, error: null }))
  })

  it('deve retornar erro 400 se o payload for inválido', async () => {
    const request = new Request('http://localhost/api/auth/register-trial', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Payload de cadastro inválido.')
  })

  it('informa indisponibilidade quando a credencial administrativa não está configurada', async () => {
    vi.mocked(createAdminClient).mockImplementationOnce(() => {
      throw new Error('Missing SUPABASE config (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).')
    })
    const request = new Request('http://localhost/api/auth/register-trial', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'João Silva', customerEmail: 'joao@realcompany.com', password: 'securepassword',
        companyName: 'Silva Corp', companyDocument: '12.345.678/0001-99', companySize: 'MPE',
        companySegment: 'Tecnologia', planName: 'Business', modules: [],
      } satisfies TrialRegistrationPayload),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Cadastro temporariamente indisponível por configuração do servidor.')
  })

  it('rejeita CNPJ já cadastrado antes de criar o usuário', async () => {
    mockDbChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'empresa-123' }, error: null })
    const request = new Request('http://localhost/api/auth/register-trial', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'João Silva', customerEmail: 'joao@realcompany.com', password: 'securepassword',
        companyName: 'Silva Corp', companyDocument: '12.345.678/0001-99', companySize: 'MPE',
        companySegment: 'Tecnologia', planName: 'Business', modules: [],
      } satisfies TrialRegistrationPayload),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Já existe uma empresa cadastrada com este CNPJ/documento. Entre com a conta existente.')
    expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('remove o usuário criado quando o provisionamento retorna falha', async () => {
    mockDbChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { modulos_incluidos: ['crm'] }, error: null })
    mockAdmin.rpc.mockResolvedValueOnce({ data: { status: 'error', message: 'Hook com falha' }, error: null })
    const request = new Request('http://localhost/api/auth/register-trial', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'João Silva', customerEmail: 'joao@realcompany.com', password: 'securepassword',
        companyName: 'Silva Corp', companyDocument: '12.345.678/0001-99', companySize: 'MPE',
        companySegment: 'Tecnologia', planName: 'Business', modules: [],
      } satisfies TrialRegistrationPayload),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-123')
  })

  it('deve realizar o fluxo completo de provisionamento com sucesso', async () => {
    mockDbChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { modulos_incluidos: ['dashboard', 'crm', 'catalogo', 'estoque'] },
        error: null,
      })
    const payloadRequest: TrialRegistrationPayload = {
      customerName: 'João Silva',
      customerEmail: 'joao@realcompany.com',
      password: 'securepassword',
      companyName: 'Silva Corp',
      companyDocument: '12.345.678/0001-99',
      companySize: 'MPE',
      companySegment: 'Tecnologia',
      planName: 'Starter',
      modules: ['crm', 'estoque'],
    }

    const request = new Request('http://localhost/api/auth/register-trial', {
      method: 'POST',
      body: JSON.stringify(payloadRequest),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    expect(mockAdmin.rpc).toHaveBeenCalledWith('provisionar_empresa_master', expect.objectContaining({
      p_modules: ['crm', 'catalogo', 'estoque'],
      p_nome: 'João Silva',
    }))
  })

  it('preserva os módulos-base do plano ao selecionar módulos adicionais', async () => {
    mockDbChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { modulos_incluidos: ['dashboard', 'crm', 'catalogo', 'estoque', 'vendas', 'financeiro', 'rh'] },
        error: null,
      })
    const request = new Request('http://localhost/api/auth/register-trial', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'João Silva', customerEmail: 'joao@realcompany.com', password: 'securepassword',
        companyName: 'Silva Corp', companyDocument: '12.345.678/0001-99', companySize: 'MPE',
        companySegment: 'Tecnologia', planName: 'Business', modules: ['os'],
      } satisfies TrialRegistrationPayload),
    })

    await POST(request)

    expect(mockAdmin.rpc).toHaveBeenCalledWith('provisionar_empresa_master', expect.objectContaining({
      p_modules: ['crm', 'catalogo', 'estoque', 'vendas', 'financeiro', 'rh', 'os'],
      p_nome: 'João Silva',
    }))
  })
})
