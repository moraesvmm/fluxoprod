// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

Deno.serve(async (req) => {
  try {
    // Validação de método
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { to, subject, html } = await req.json();

    // Validação de campos obrigatórios
    if (!to || !subject || !html) {
      return new Response('Missing required fields: to, subject, html', { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validação da API key
    if (!RESEND_API_KEY) {
      return new Response('RESEND_API_KEY not configured', { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
