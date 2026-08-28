FROM node:24-bookworm-slim AS dependencies
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-bookworm-slim AS builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend ./
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=dependencies --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/backend/package.json ./package.json
COPY --from=builder --chown=node:node /app/backend/server.js ./server.js
COPY --from=builder --chown=node:node /app/backend/middleware ./middleware
COPY --from=builder --chown=node:node /app/backend/routes ./routes
COPY --from=builder --chown=node:node /app/backend/services ./services
COPY --from=builder --chown=node:node /app/backend/utils ./utils
USER node
EXPOSE 8080
CMD ["node", "server.js"]
