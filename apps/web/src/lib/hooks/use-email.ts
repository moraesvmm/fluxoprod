import { createClient } from "@/utils/supabase/client";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html }
    });

    if (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao invocar função de e-mail:', error);
    throw error;
  }
}

export function useEmail() {
  const send = async ({ to, subject, html }: SendEmailParams) => {
    return sendEmail({ to, subject, html });
  };

  return { send };
}
