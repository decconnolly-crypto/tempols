FROM node:22-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package definitions
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

EXPOSE 3002

ENV NODE_ENV=production

# The ultimate fix: Navigate to apps/api, physically write the .env file Prisma demands, generate, push, and start.
CMD ["sh", "-c", "cd apps/api && echo \"DATABASE_URL=file:/app/apps/api/prisma/dev.db\" > .env && npx prisma generate && npx prisma db push && npx tsx src/index.ts"]