const prisma = require('../config/prisma');
const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');
const {
  hashPassword,
  comparePassword,
  signToken,
  toPublicUser,
} = require('../services/auth.service');

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

async function getMe(req, res) {
  res.json({ success: true, data: { user: toPublicUser(req.user) } });
}

module.exports = { register, login, logout, getMe };
