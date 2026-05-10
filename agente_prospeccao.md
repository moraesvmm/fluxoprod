# Agente de Prospecção B2B — Prompt de Execução Diária

## Como usar
Ao abrir este arquivo, diga à IA (Antigravity):
> "Leia o agente_prospeccao.md e execute o disparo do dia."

O agente fará tudo automaticamente: identificará o dia da semana, selecionará os 20 prospects do dia, gerará e-mails personalizados e disparará via Resend.
---

## Identidade do Produto

A identidade completa do produto (nome, pitch, funcionalidades, diferenciais, público-alvo, remetente e e-mail) já está conhecida pela Antigravity. Não é necessário preencher nada aqui — a IA já possui esse contexto.

---

## Credenciais

- **Resend API Key:** `re_Bw2VwgXQ_3PK9a3zeHtJP3FYudop3jpyg`
- **IA:** Antigravity (contexto completo do produto já carregado)

---

## Perfil de Cliente Ideal (ICP)

O ICP também é conhecido pela Antigravity com base na identidade do produto. Usar o conhecimento já carregado sobre segmento, porte, região, cargo do decisor e palavras-chave ideais para o Fluxo ERP.

---

## Instruções de Execução

### Passo 0 — Ler o site do produto e a documentação técnica para identificar os diferenciais do produto
Antes de qualquer outra ação, usar o conteúdo já extraído do site `https://seufluxoerp.com.br` e a @DOCUMENTACAO_TECNICA.md contida nesse repositório para enriquecer os e-mails com argumentos reais e específicos do produto — especialmente funcionalidades que resolvam diretamente a dor de cada prospect.

### Passo 1 — Identificar o dia
Identifique o dia da semana atual e aplique o gancho contextual correspondente em TODOS os e-mails do dia.

### Passo 2 — Gerar lista de 20 prospects
Gere uma lista de 20 empresas fictícias mas altamente realistas que seriam clientes ideais para o Fluxo ERP.
Para cada empresa, identifique uma dor específica que um módulo ou funcionalidade real do sistema resolve.

### Passo 3 — Validar e-mails
Antes de enviar, verifique se o e-mail de cada prospect é coerente com o domínio da empresa listada.

### Passo 4 — Gerar e-mail personalizado para cada prospect
Para cada um dos 20 prospects, gerar um e-mail individual seguindo:
- Princípios de Dale Carnegie (focar neles, despertar desejo, conexão).
- Tom humano, direto e inteligente (zero linguagem de IA).
- Gancho do dia incorporado naturalmente.
- **Inclusão obrigatória do link seufluxoerp.com.br** como solução para a dor.
- Assunto curioso e específico (máximo 8 palavras).

### Passo 5 — Montar e-mail com assinatura profissional em HTML
Cada e-mail deve ser enviado em formato HTML com a estrutura padrão definida.

### Passo 6 — Disparar via Resend
Para cada prospect, disparar via API do Resend aguardando 5 segundos entre envios.

### Passo 7 — Relatório final
Ao concluir, exibir o resumo dos envios e atualizar o arquivo `log_envios.md`.
