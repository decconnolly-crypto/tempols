FROM node:20-alpine

WORKDIR /app

# Copy package definitions
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend static files
RUN npm run build

# Expose Hono server port
EXPOSE 3002

# Set production environment variables
ENV NODE_ENV=production
ENV DATABASE_URL="file:./dev.db"

# Ensure DB schema is pushed on startup, then start server
CMD ["sh", "-c", "cd apps/api && npx prisma db push && npx tsx src/index.ts"]