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
}

export interface PaymentGatewayResponse {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  error?: string;
}

/**
 * Service Abstrato para processamento de Gateway de Pagamento.
 * Pronto para integração com VisionPay, AbacatePay, Stripe, Asaas, etc.
 */
export class PaymentGatewayService {
  /**
   * INSTRUÇÕES PARA INTEGRAÇÃO:
   * 1. Insira sua URL de API BASE do Gateway aqui.
   * 2. Configure a API KEY de forma segura via process.env.GATEWAY_API_KEY.
   */
  // private static readonly GATEWAY_BASE_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://api.visionpay.com/v1";
  // private static readonly API_KEY = process.env.GATEWAY_API_KEY;

  /**
   * Finaliza a compra chamando o Gateway de Pagamento.
   * 
   * @param payload Dados da transação (Cliente, Empresa, Modulos)
   * @returns O ID transacional e/ou a URL do checkout externo/PIX QrCode.
   */
  public static async createTransaction(payload: PaymentTransactionPayload): Promise<PaymentGatewayResponse> {
    try {
      // ===== IMPLEMENTAÇÃO REAL (DESCOMENTAR E AJUSTAR QUANDO TIVER O GATEWAY) =====
      /*
      const response = await fetch(`${this.GATEWAY_BASE_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify({
          amount: payload.amount,
          paymentMethod: "credit_card", // ou "pix"
          customer: {
            name: payload.customerName,
            email: payload.customerEmail,
            document: payload.companyDocument
          },
          metadata: {
            planName: payload.planName,
            modules: payload.modules,
            companyName: payload.companyName,
            companySize: payload.companySize,
            companySegment: payload.companySegment
          },
          // importente: o Webhook enviará requisição de volta contendo esse ID.
          webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/payment`
        })
      });

      if (!response.ok) {
        throw new Error("Falha no provedor de pagamento");
      }

      const data = await response.json();
      return { success: true, transactionId: data.id, redirectUrl: data.checkoutUrl };
      */

      // ===== IMPLEMENTAÇÃO SIMULADA PARA ESTE AMBIENTE =====
      // Simulando delay de rede do gateway
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulando uma transação bem-sucedida gerada no backend do gateway
      const mockTransactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      return {
        success: true,
        transactionId: mockTransactionId,
        // Ao invés de uma URL de Checkout real, nós apenas simulamos que foi bem-sucedido.
      };

    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Erro desconhecido ao processar transação no Gateway"
      };
    }
  }

  /**
   * Valida a assinatura (Signature) do Webhook do Gateway para garantir autenticidade.
   * Chame essa função na Route API do Next.js.
   */
  public static verifyWebhookSignature(headerSignature: string, payloadBody: string): boolean {
    // ===== IMPLEMENTAÇÃO REAL =====
    /*
    const crypto = require("crypto");
    const webhookSecret = process.env.GATEWAY_WEBHOOK_SECRET;
    const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(payloadBody).digest("hex");
    return headerSignature === expectedSignature;
    */
    
    // ===== SIMULAÇÃO (Sempre retorna true) =====
    return true;
  }
}
