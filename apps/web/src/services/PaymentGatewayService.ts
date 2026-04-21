export interface PaymentTransactionPayload {
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  modules: string[];
  companyName: string;
  companyDocument: string;
  companySize: string;
  companySegment: string;
  metadata?: any;
}

export interface PaymentGatewayResponse {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  pixData?: any;
  error?: string;
}

/**
 * Service para processamento de Gateway de Pagamento (Asaas).
 */
export class PaymentGatewayService {
  private static readonly ASAAS_API_URL = process.env.NEXT_PUBLIC_GATEWAY_MODE === 'production' 
    ? "https://api.asaas.com/v3" 
    : "https://sandbox.asaas.com/api/v3";

  private static readonly API_KEY = process.env.ASAAS_API_KEY || process.env.NEXT_PUBLIC_GATEWAY_API_KEY;

  /**
   * Finaliza a compra chamando o Gateway de Pagamento (Asaas).
   * 
   * @param payload Dados da transação (Cliente, Empresa, Modulos)
   * @returns O ID transacional e a URL do checkout/PIX.
   */
  public static async createTransaction(payload: any): Promise<PaymentGatewayResponse> {
    try {
      if (!this.API_KEY) {
        throw new Error("Chave de API do Gateway não configurada.");
      }

      // 1. Criar ou buscar Cliente no Asaas
      const customerResponse = await fetch(`${this.ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": this.API_KEY
        },
        body: JSON.stringify({
          name: payload.customerName,
          email: payload.customerEmail,
          cpfCnpj: payload.companyDocument?.replace(/[^0-9]/g, ''),
          notificationDisabled: true
        })
      });

      const customerData = await customerResponse.json();
      const asaasCustomerId = customerData.id;

      if (!asaasCustomerId) {
        // Se já existir, tentar buscar pelo e-mail
        const searchResponse = await fetch(`${this.ASAAS_API_URL}/customers?email=${payload.customerEmail}`, {
          headers: { "access_token": this.API_KEY }
        });
        const searchData = await searchResponse.json();
        if (searchData.data?.[0]?.id) {
          customerData.id = searchData.data[0].id;
        } else {
          throw new Error("Falha ao criar/identificar cliente no Asaas.");
        }
      }

      // 2. Criar Pagamento (PIX por padrão para agilizar onboarding, ou conforme escolha)
      const paymentResponse = await fetch(`${this.ASAAS_API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": this.API_KEY
        },
        body: JSON.stringify({
          customer: customerData.id,
          billingType: "PIX",
          value: payload.amount,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // +1 dia
          description: `Assinatura Fluxo ERP - Plano ${payload.planName}`,
          externalReference: `fluxo_${Date.now()}`,
          metadata: {
            companyName: payload.companyName,
            companySize: payload.companySize,
            companySegment: payload.companySegment,
            planName: payload.planName,
            modules: JSON.stringify(payload.modules),
            password: payload.metadata?.password // Sensível, mas necessário para o webhook provisionar
          }
        })
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.errors?.[0]?.description || "Falha ao criar pagamento no Asaas");
      }

      const paymentData = await paymentResponse.json();

      // Se for PIX, pegamos os dados do QR Code
      let pixQrCode = null;
      if (paymentData.billingType === "PIX") {
        const pixResponse = await fetch(`${this.ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
          headers: { "access_token": this.API_KEY }
        });
        pixQrCode = await pixResponse.json();
      }

      return { 
        success: true, 
        transactionId: paymentData.id, 
        redirectUrl: paymentData.invoiceUrl,
        // Extendemos o retorno para suportar PIX no frontend se necessário
        ...(pixQrCode && { pixData: pixQrCode })
      } as any;

    } catch (error: any) {
      console.error("PaymentGateway Error:", error);
      return {
        success: false,
        error: error?.message || "Erro ao processar transação no Asaas"
      };
    }
  }

  /**
   * Valida a assinatura do Webhook. No Asaas, comparamos o token configurado.
   */
  public static verifyWebhookSignature(headerSignature: string, payloadBody: string): boolean {
    const webhookSecret = process.env.GATEWAY_WEBHOOK_SECRET || process.env.TOKEN_WEBHOOK;
    
    // O Asaas envia o token no header 'asaas-access-token' se configurado
    // ou podemos usar a lógica de signature se o usuário implementou um HMAC customizado.
    // Baseado no request, utilizaremos comparação direta do token (padrão Asaas).
    if (!webhookSecret) return false;
    return headerSignature === webhookSecret;
  }
}
