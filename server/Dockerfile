FROM node:24-alpine

# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

# Applies any pending migrations, then starts the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
