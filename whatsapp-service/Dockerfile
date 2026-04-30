FROM node:20-alpine
LABEL version="1.1.0"

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx tsc

# Remover devDependencies após o build
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/index.js"]
