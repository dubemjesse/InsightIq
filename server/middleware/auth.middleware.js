const { verifyToken } = require('../services/auth.service');
const { ApiError } = require('./errorHandler');
const prisma = require('../config/prisma');

/** Extracts the JWT from the Authorization header, falling back to the httpOnly cookie. */
function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return req.cookies?.token || null;
}

/** Verifies the JWT and attaches the authenticated user to `req.user`. */
async function protect(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new ApiError(401, 'Not authenticated. Please log in.');
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Your session is no longer valid. Please log in again.');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return next(err);
    }
    next(new ApiError(401, 'Invalid or expired session. Please log in again.'));
  }
}

/** Restricts a route to one or more roles. Must run after `protect`. */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
}

module.exports = { protect, requireRole };
