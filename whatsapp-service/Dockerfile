FROM node:20-alpine

WORKDIR /app

# Copiar apenas os arquivos do serviço (sem workspace monorepo)
COPY package.json ./
COPY package-lock.json ./

# Instalar dependências
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev --ignore-scripts

# Copiar código fonte
COPY src ./src
COPY tsconfig.json ./

# Compilar TypeScript
RUN npx tsc

# Expor porta
EXPOSE 3001

# Iniciar serviço
CMD ["node", "dist/index.js"]
