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
  private static readonly LOCAL_API_URL = "/api/asaas";


  /**
   * Finaliza a compra chamando o Gateway de Pagamento (Asaas).
   * 
   * @param payload Dados da transação (Cliente, Empresa, Modulos)
   * @returns O ID transacional e a URL do checkout/PIX.
   */
  public static async createTransaction(payload: any): Promise<PaymentGatewayResponse> {
    try {

      // 1. Criar ou buscar Cliente no Asaas via Proxy Interno
      const customerResponse = await fetch(`${this.LOCAL_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: payload.customerName,
          email: payload.customerEmail,
          cpfCnpj: payload.companyDocument?.replace(/[^0-9]/g, ''),
          notificationDisabled: true
        })
      });

      let customerData = await customerResponse.json();

      if (!customerData.id) {
        // Se falhou, tentar buscar pelo e-mail (pode ser que o cliente já exista)
        const searchResponse = await fetch(`${this.LOCAL_API_URL}/customers?email=${payload.customerEmail}`);
        const searchData = await searchResponse.json();
        
        if (searchData.data?.[0]?.id) {
          customerData = searchData.data[0];
        } else {
          // Se nem a criação nem a busca funcionaram, pegamos o erro original da criação se houver
          const asaasErrorMessage = customerData.errors?.[0]?.description || "Falha ao criar/identificar cliente no Asaas.";
          throw new Error(asaasErrorMessage);
        }
      }

      const asaasCustomerId = customerData.id;


      // 2. Criar Pagamento via Proxy Interno
      const paymentResponse = await fetch(`${this.LOCAL_API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "PIX",
          value: payload.amount,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // +1 dia
          description: `Assinatura Fluxo ERP - Plano ${payload.planName}`,
          externalReference: `fluxo_${Date.now()}`,
          metadata: {
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            companyDocument: payload.companyDocument,
            companyName: payload.companyName,
            companySize: payload.companySize,
            companySegment: payload.companySegment,
            planName: payload.planName,
            modules: JSON.stringify(payload.modules),
            password: payload.metadata?.password
          }
        })
      });


      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.errors?.[0]?.description || "Falha ao criar pagamento no Asaas");
      }

      const paymentData = await paymentResponse.json();

      // Se for PIX, pegamos os dados do QR Code via Proxy Interno
      let pixQrCode = null;
      if (paymentData.billingType === "PIX") {
        const pixResponse = await fetch(`${this.LOCAL_API_URL}/payments?paymentId=${paymentData.id}&type=pixQrCode`);
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
