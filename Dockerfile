FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy the entire workspace
COPY . .

# Install dependencies for the whole workspace
# Since it's a monorepo, we need all workspace folders present for npm ci
RUN npm ci

# Build the whatsapp-service
RUN npm run whatsapp:build

# Set the working directory to the service
WORKDIR /app/whatsapp-service

# Expose the port
EXPOSE 3001

# Start the service
CMD ["npm", "start"]
