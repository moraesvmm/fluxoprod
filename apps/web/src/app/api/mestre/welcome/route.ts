import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
    }

    await sendWelcomeEmail(email, name);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in welcome email route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
