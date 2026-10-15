# HelpDesk 360 - Production Backend Container
# Node.js 20 Alpine with native SQLite3 compilation tools

FROM node:20-alpine AS base

# Install build dependencies for sqlite3 native binary compilation
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

# Copy root and backend dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps

# Copy backend application source code
COPY backend/ ./backend/

# Create persistent database mount directory
RUN mkdir -p /data && chown -R node:node /app /data

# Switch to non-privileged container user
USER node

# Environment defaults
ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/data/helpdesk.db
ENV JWT_SECRET=helpdesk-360-enterprise-production-secret-key-2024

EXPOSE 5000

WORKDIR /app/backend

# Production start command
CMD ["node", "server.js"]
