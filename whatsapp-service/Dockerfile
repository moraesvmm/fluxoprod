FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx tsc

# Remover devDependencies após o build
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/index.js"]
