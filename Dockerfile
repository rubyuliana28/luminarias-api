# ---------- Base: lo que comparten todas las etapas ----------
FROM node:24-slim AS base
# Prisma necesita OpenSSL (su motor de migraciones lo usa en Linux)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- Etapa 1: compilar (con todas las dependencias) ----------
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
# DATABASE_URL de relleno: solo para generar el cliente, no se conecta a nada
RUN DATABASE_URL="postgresql://u:p@localhost:5432/db" npx prisma generate
RUN npm run build

# ---------- Etapa 2: solo dependencias de producción ----------
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Imagen final: lo mínimo para correr ----------
FROM base
ENV NODE_ENV=production
COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma7.config.ts ./
COPY --chown=node:node prisma ./prisma
# No correr como root: si alguien explota la app, no es dueño del contenedor
USER node
EXPOSE 3000
CMD ["node", "dist/main"]