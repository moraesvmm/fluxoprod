FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package.json and package-lock.json
COPY package*.json ./

# Copy whatsapp-service package.json
# We need to create the directory structure so npm workspaces work
COPY whatsapp-service/package.json ./whatsapp-service/

# Install dependencies for the whole workspace
RUN npm ci

# Copy the rest of the workspace
COPY . .

# Build the whatsapp-service
RUN npm run whatsapp:build

# Set the working directory to the service
WORKDIR /app/whatsapp-service

# Expose the port
EXPOSE 3001

# Start the service
CMD ["npm", "start"]
