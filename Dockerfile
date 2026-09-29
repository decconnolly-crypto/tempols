FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native packages (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package definitions
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client at root level
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build frontend static files
RUN npm run build

# Expose Hono server port
EXPOSE 3002

# Set production environment variables
ENV NODE_ENV=production
ENV DATABASE_URL="file:./dev.db"

# Push DB schema on startup and launch backend
CMD ["sh", "-c", "cd apps/api && npx prisma db push && npx tsx src/index.ts"]