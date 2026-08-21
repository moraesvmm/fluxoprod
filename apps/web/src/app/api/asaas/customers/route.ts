import { NextResponse } from "next/server";

/**
 * API Route Handler para proxyar chamadas de criação de clientes para o Asaas.
 * Evita erros de CORS e protege a ASAAS_API_KEY no servidor.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Configuração do Gateway ausente no servidor" }, { status: 500 });
    }

    const mode = process.env.NEXT_PUBLIC_GATEWAY_MODE === 'production' ? "api" : "sandbox";
    const url = `https://${mode}.asaas.com/v3/customers`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: unknown) {
    console.error("Asaas Customer Proxy Error:", error);
    return NextResponse.json({ error: "Erro interno ao processar cliente" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Configuração do Gateway ausente" }, { status: 500 });
    }

    const mode = process.env.NEXT_PUBLIC_GATEWAY_MODE === 'production' ? "api" : "sandbox";
    const url = `https://${mode}.asaas.com/v3/customers?email=${email}`;

    const response = await fetch(url, {
      headers: {
        "access_token": apiKey
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar cliente" }, { status: 500 });
  }
}
