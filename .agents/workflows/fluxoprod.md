---
description: Regras de segurança e operação para o projeto fluxoprod
---

Não utilize as chaves keys aqui em outro projeto que não seja o "fluxoprod"
Utilize sempre a service_role e o MCP do Supabase para auxiliar nas ações e investigações, o intuito é ser o mais preciso possível quanto ao banco de dados. (Consulte as variáveis de ambiente para a SERVICE_ROLE)
Sempre que alterar algo no banco de dados que acarreta em mudança no frontend, realize a alteração no frontend também. E vice-versa. Não deve-se deixar índices soltos.
Os códigos .py são código-morto e não devem ser utilizados.
Sempre agir com base nos documentos técnicos e vistorias.
Utilize a @DOCUMENTACAO_TECNICA.md e @VISTORIAS.md como base da verdade do sistema para evitar falhas e disrupções de código.
Sempre que fizermos no mínimo 3 alterações no código-fonte, deve alterar a documentação @VISTORIAS.MD deixando que está pendente realizar uma vistoria e deve ser feita o mais rápido possível, após as alterações.
Sempre que implementarmos novas funções nos módulos ou sistema, deve-se atualizar os cards informativos do módulo respectivo na página de "checkout" para incluir a nova funcionalidade na informação.
Utilize a Managament Key (sbp_...) via variáveis de ambiente para executar comandos SQL.
Utilize a URI do banco de dados via variáveis de ambiente para executar comandos SQL.
Token da Vercel: (Consulte as variáveis de ambiente)
Token da Railway: (Consulte as variáveis de ambiente)