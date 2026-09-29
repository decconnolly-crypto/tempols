FROM node:22-alpine

WORKDIR /app

# Install build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN cd apps/api && npx prisma generate

# Build frontend
RUN npm run build

# Ensure database directory exists and is writable
RUN mkdir -p /app/apps/api/prisma && chmod -R 777 /app/apps/api/prisma

EXPOSE 3002

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/apps/api/prisma/dev.db"

CMD ["sh", "-c", "cd apps/api && DATABASE_URL=file:/app/apps/api/prisma/dev.db npx prisma db push --accept-data-loss && npx tsx src/index.ts"]