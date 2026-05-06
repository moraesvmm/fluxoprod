import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email'

// Mock de uma cadeia de banco de dados (QueryBuilder)
const mockDbChain: any = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() => Promise.resolve({ data: {}, error: null })),
  maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  then: vi.fn().mockImplementation((resolve) => resolve({ data: {}, error: null })),
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
    mockAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
    mockAdmin.rpc.mockResolvedValue({ data: { status: 'success' }, error: null })
    mockDbChain.then.mockImplementation((resolve) => resolve({ data: {}, error: null }))
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

  it('deve realizar o fluxo completo de provisionamento com sucesso', async () => {
    const request = new Request('http://localhost/api/auth/register-trial', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'João Silva',
        customerEmail: 'joao@realcompany.com',
        password: 'securepassword',
        companyName: 'Silva Corp',
        companyDocument: '12.345.678/0001-99',
        planName: 'Starter',
        modules: ['crm', 'estoque'],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    expect(mockAdmin.rpc).toHaveBeenCalledWith('provisionar_empresa_master', expect.objectContaining({
      p_modules: ['crm', 'estoque']
    }))
  })
})
