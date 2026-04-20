# 🛡️ PLANO DE PREVENÇÃO DE DEPLOY - FLUXO ERP

Este documento é a **Fonte Única da Verdade** para o processo de CI/CD do sistema Fluxo. Ele consolida o aprendizado de falhas críticas anteriores e estabelece o protocolo obrigatório de publicação.

> [!IMPORTANT]
> **OBRIGATORIEDADE:** Nenhum deploy deve ser realizado sem a execução prévia e completa do [Walkthrough de Pré-Flight](#-walkthrough-obrigatorio-pre-flight).

---

## 🕒 RETROSPECTIVA DE INCIDENTES (GRADUAL)

Abaixo estão registrados os incidentes técnicos que moldaram este plano, transferidos das vistorias técnicas:

### 1. Conflito de Runtime (Node 20 vs 24)
- **Data:** 20/04/2026
- **Falha:** Tentativa de rodar runners depreciados com flags de compatibilidade conflituosas.
- **Causa:** O uso simultâneo de `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION` e `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` travou o engine do GitHub.
- **Solução:** Upgrade integral das Actions para `@v6` e travamento do projeto em Node `24.x`.

### 2. Erros de Tipagem Silenciosos (TypeScript)
- **Data:** 20/04/2026
- **Falha:** Build abortado na Netlify com `exit code 1`.
- **Causa:** Uso do atributo `loading="lazy"` em tags `<video>`, o que não é suportado pelo React/TypedHTML, gerando erro de compilação TS2322.
- **Solução:** Remoção do atributo e estabelecimento de check local de build.

### 3. Mismatch de Caminhos em Monorepo
- **Data:** 20/04/2026
- **Falha:** `Error: Your publish directory was not found at: .../.next`.
- **Causa:** O build ocorria na subpasta `apps/web`, mas o `netlify.toml` instruía o plugin a buscar o build na raiz do repositório.
- **Solução:** Ajuste do caminho de publicação para `apps/web/.next` no arquivo mestre.

---

## 🛠️ ESPECIFICAÇÕES DE INFRAESTRUTURA

Para garantir a estabilidade, o ambiente de build deve respeitar:
- **Node.js:** Versão `24.x` (LTS recomendado para Netlify Plugin v5).
- **GitHub Actions:** `checkout@v6`, `setup-node@v6`.
- **Netlify Plugin:** `@netlify/plugin-nextjs` v5.15.9+.
- **Publish Path:** `apps/web/.next`.

---

## ✅ WALKTHROUGH OBRIGATÓRIO (PRE-FLIGHT)

Siga este passo-a-passo rigorosamente antes de cada `git push` para a branch `main`:

### 1. Validação de Compilação Local
Execute o build localmente para garantir que não há erros de TypeScript mascarados:
```bash
cd apps/web
npm run build
```
> [!CAUTION]
> Se o build local falhar, **NÃO** suba o código. Corrija os erros de tipo primeiro.

### 2. Auditoria de Atributos de Mídia
Verifique se novas tags de mídia foram adicionadas:
- Tags `<video>` **NÃO** podem conter o atributo `loading="lazy"`.
- Prefira usar o componente `<Image />` do Next.js para imagens otimizadas.

### 3. Verificação de Configuração de Caminho
Verifique o arquivo `netlify.toml` na raiz:
- Certifique-se de que `publish = "apps/web/.next"`.
- Certifique-se de que `base = "apps/web"`.

### 4. Gestão de Deploy (Skip CI)
Se a alteração for apenas de documentação ou arquivos que não impactam o site funcional:
- Adicione `[skip ci]` ao final da mensagem de commit para economizar recursos e evitar builds desnecessários.

---

## 📈 CRITÉRIO DE SUCESSO
O deploy é considerado bem-sucedido apenas se:
1. O log da GitHub Action retornar `Process completed with exit code 0`.
2. O log do Netlify Build mostrar `Using Next.js Runtime - v5.x`.
3. O diretório de publicação for localizado corretamente sem erros de "Not Found".
