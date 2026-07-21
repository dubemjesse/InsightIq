require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
  );
}

if (!/^[0-9a-f]{64}$/i.test(process.env.ENCRYPTION_KEY)) {
  throw new Error(
    'ENCRYPTION_KEY must be a 32-byte key encoded as 64 hex characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  // 32-byte (64 hex char) key used to encrypt stored DB credentials at rest.
  encryptionKey: process.env.ENCRYPTION_KEY,
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
  },
  email: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || 'InsightIQ <no-reply@insightiq.app>',
  },
  uploads: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 25,
  },
};
