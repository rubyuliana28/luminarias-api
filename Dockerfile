FROM node:24-slim

# Prisma necesita OpenSSL en esta imagen
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) Dependencias primero: Docker reutiliza esta capa si no cambian
COPY package*.json ./
RUN npm ci

# 2) El código del proyecto
COPY . .

# 3) Cliente de Prisma y compilación
#    (DATABASE_URL de relleno: solo para generar el cliente, no se conecta a nada)
RUN DATABASE_URL="postgresql://u:p@localhost:5432/db" npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main"]