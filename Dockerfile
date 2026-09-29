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

# Generate Prisma Client explicitly using the absolute schema path
RUN npx prisma generate --schema=/app/apps/api/prisma/schema.prisma

# Build frontend
RUN npm run build

EXPOSE 3002

ENV NODE_ENV=production

# Force the unquoted URL directly into the execution step
CMD ["sh", "-c", "DATABASE_URL=file:/app/apps/api/prisma/dev.db npx prisma db push --schema=/app/apps/api/prisma/schema.prisma && npx tsx /app/apps/api/src/index.ts"]