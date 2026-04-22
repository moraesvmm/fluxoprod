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
  metadata?: {
    password?: string;
  };
}

export interface PaymentGatewayResponse {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  pixData?: unknown;
  error?: string;
}

export class PaymentGatewayService {
  public static async createTransaction(
    payload: PaymentTransactionPayload
  ): Promise<PaymentGatewayResponse> {
    try {
      const checkoutResponse = await fetch("/api/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          password: payload.metadata?.password,
          planName: payload.planName,
          amount: payload.amount,
          modules: payload.modules,
          companyName: payload.companyName,
          companyDocument: payload.companyDocument,
          companySize: payload.companySize,
          companySegment: payload.companySegment,
        }),
      });

      const checkoutData = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        throw new Error(checkoutData.error || "Falha ao iniciar checkout");
      }

      return {
        success: true,
        transactionId: checkoutData.transactionId,
        redirectUrl: checkoutData.redirectUrl,
      };
    } catch (error: any) {
      console.error("PaymentGateway Error:", error);
      return {
        success: false,
        error: error?.message || "Erro ao processar transação no Asaas",
      };
    }
  }

  public static verifyWebhookSignature(headerSignature: string): boolean {
    const webhookSecret = process.env.GATEWAY_WEBHOOK_SECRET || process.env.TOKEN_WEBHOOK;
    if (!webhookSecret) return false;
    return headerSignature === webhookSecret;
  }
}
