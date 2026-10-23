const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

/** Strips passwordHash before a user record is ever sent to the client. */
function toPublicUser(user) {
  const { passwordHash, resetPasswordTokenHash, resetPasswordExpiresAt, ...publicUser } = user;
  return publicUser;
}

/**
 * Generates a password-reset token pair: the raw token (emailed to the user,
 * never stored) and its SHA-256 hash + expiry (stored on the user record).
 * Hashing at rest means a database leak alone can't be used to reset accounts.
 */
function createResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  return { rawToken, tokenHash, expiresAt };
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  toPublicUser,
  createResetToken,
  hashResetToken,
};
