import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.ASAAS_API_KEY;

    const mode = process.env.NEXT_PUBLIC_GATEWAY_MODE === 'production' ? "api" : "sandbox";
    const url = `https://${mode}.asaas.com/v3/payments`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey || ""
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao criar pagamento" }, { status: 500 });
  }
}

/**
 * Endpoint para buscar QR Code PIX ou detalhes específicos
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");
    const type = searchParams.get("type"); // e.g. "pixQrCode"
    const apiKey = process.env.ASAAS_API_KEY;

    const mode = process.env.NEXT_PUBLIC_GATEWAY_MODE === 'production' ? "api" : "sandbox";
    
    let url = `https://${mode}.asaas.com/v3/payments/${paymentId}`;
    if (type === "pixQrCode") {
      url += "/pixQrCode";
    }

    const response = await fetch(url, {
      headers: {
        "access_token": apiKey || ""
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar dados do pagamento" }, { status: 500 });
  }
}
