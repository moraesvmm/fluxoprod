# Regras Operacionais do Projeto Fluxoprod

Estas regras devem ser tratadas como instruções obrigatórias para qualquer trabalho neste repositório.

## Regras Gerais

- Só subir ou criar commit quando isso for solicitado explicitamente pelo usuário.
- A hospedagem atual do projeto é a Vercel. Qualquer diagnóstico, ajuste de build ou deploy deve partir dessa premissa.
- Sempre agir com base nos documentos técnicos e vistorias do projeto.
- Os arquivos `.py` deste repositório são código morto e não devem ser usados como base de implementação, integração ou manutenção.
- Em máquina corporativa, qualquer instalação de dependências, runtimes ou ferramentas deve ser feita de maneira silenciosa ou local, evitando conflito com restrições da estação.

## Fonte de Verdade

- Usar [`docs/DOCUMENTACAO_TECNICA.md`](docs/DOCUMENTACAO_TECNICA.md) e [`docs/VISTORIAS.md`](docs/VISTORIAS.md) como base da verdade do sistema.
- Antes de qualquer deploy, ler obrigatoriamente [`docs/PLANO_PREVENCAO_DEPLOY.md`](docs/PLANO_PREVENCAO_DEPLOY.md).
- Sempre que houver divergência entre implementação e documentação técnica/vistoria, a investigação deve partir desses documentos antes de propor mudanças.

## Banco de Dados e Supabase

- Priorizar o uso de `service_role` e do MCP do Supabase em ações e investigações relacionadas ao banco, buscando máxima precisão.
- As credenciais sensíveis de Supabase e acesso SQL devem permanecer em armazenamento local seguro ou variáveis de ambiente; não devem ser replicadas em arquivos versionados do repositório.
- Alterações de banco que afetem frontend exigem ajuste correspondente no frontend.
- Alterações no frontend que dependam de estrutura, RPC, view, policy, índice ou comportamento de banco exigem ajuste correspondente no banco.
- Não deixar índices, contratos ou integrações soltas entre frontend e banco.

## Documentação e Vistorias

- Sempre que forem realizadas no mínimo 3 alterações no código-fonte, atualizar `docs/VISTORIAS.md` informando que há pendência de nova vistoria, a ser executada com prioridade.
- Sempre agir com base nos documentos técnicos e vistorias ao investigar bugs, evoluir módulos ou revisar comportamento do sistema.

## Módulos e Checkout

- Sempre que uma nova função for implementada em um módulo ou no sistema, atualizar os cards informativos do módulo correspondente na página de `checkout`, incluindo a nova funcionalidade.

## Segurança Operacional

- Não persistir segredos recebidos em conversa em arquivos rastreados pelo Git.
- Quando necessário usar credenciais locais já fornecidas pelo usuário, consumi-las a partir do ambiente local apropriado durante a execução, sem duplicação documental.
