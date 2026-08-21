import { describe, it, expect, vi, afterEach } from 'vitest'
import { POST } from '../route'

describe('Upgrade/Checkout API', () => {
  afterEach(() => vi.restoreAllMocks())

  it('encaminha o upgrade para o checkout canônico sem aceitar empresa ou preço do cliente', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, redirectUrl: 'https://asaas.com/pagamento' }), { status: 200 })
    )

    const request = new Request('https://fluxoerp.com.br/api/checkout/upgrade', {
      method: 'POST',
      headers: { cookie: 'sb-session=valid' },
      body: JSON.stringify({ empresaId: 'empresa-de-outra-pessoa', amount: 0.01, modules: ['estoque'] }),
    })

    const response = await POST(request)
    const data = await response.json()
    const forwardedBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))

    expect(response.status).toBe(200)
    expect(data.redirectUrl).toBe('https://asaas.com/pagamento')
    expect(forwardedBody).toEqual({ isUpgrade: true, moduleKey: 'estoque' })
    expect(fetchMock.mock.calls[0][0].toString()).toContain('/api/checkout/session')
  })
})
