const { PrismaClient } = require('@prisma/client');

// Single shared Prisma instance, reused across the app (and across
// hot-reloads in dev) to avoid exhausting Postgres connections.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
