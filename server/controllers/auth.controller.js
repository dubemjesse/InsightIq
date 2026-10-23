const prisma = require('../config/prisma');
const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');
const {
  hashPassword,
  comparePassword,
  signToken,
  toPublicUser,
  createResetToken,
  hashResetToken,
} = require('../services/auth.service');
const emailService = require('../services/emailService');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists.');
    }

    // Bootstrap: the very first account created becomes an Admin so there's
    // always someone who can manage roles. Everyone after defaults to Viewer.
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'VIEWER';

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
    });

    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      data: { user: toPublicUser(user), token },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      throw new ApiError(401, 'Invalid email or password.');
    }
    if (!user.isActive) {
      throw new ApiError(403, 'This account has been deactivated. Contact an admin.');
    }

    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({
      success: true,
      data: { user: toPublicUser(user), token },
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: undefined });
  res.json({ success: true, message: 'Logged out.' });
}

/**
 * Always responds with the same generic message, whether or not the email
 * is registered — so this endpoint can't be used to enumerate accounts.
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const genericMessage = 'If an account exists for that email, a password reset link has been sent.';

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: true, message: genericMessage });
    }

    const { rawToken, tokenHash, expiresAt } = createResetToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: expiresAt },
    });

    const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}`;

    try {
      await emailService.sendPasswordResetEmail(user, resetUrl);
    } catch (err) {
      // SMTP isn't configured (or failed) — log the link so local/dev use
      // still works, but don't fail the request or leak this to the client.
      console.log(`[email] Could not send password reset email (${err.message}). Reset link for ${user.email}:`);
      console.log(`  ${resetUrl}`);
    }

    res.json({
      success: true,
      message: genericMessage,
      // Dev convenience only: lets you test the flow without SMTP configured.
      // Never included outside development.
      ...(env.nodeEnv !== 'production' && { devResetUrl: resetUrl }),
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const tokenHash = hashResetToken(token);

    const user = await prisma.user.findFirst({
      where: { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: { gt: new Date() } },
    });
    if (!user) {
      throw new ApiError(400, 'This reset link is invalid or has expired. Request a new one.');
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetPasswordTokenHash: null, resetPasswordExpiresAt: null },
    });

    res.json({ success: true, message: 'Password updated. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res) {
  res.json({ success: true, data: { user: toPublicUser(req.user) } });
}

module.exports = { register, login, logout, getMe, forgotPassword, resetPassword };
