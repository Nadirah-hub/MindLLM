/**
 * Auth middleware: require valid JWT for protected routes.
 * Authentication status is checked at the start of every interaction.
 */

import { verifyToken } from './auth.js';

/**
 * Require Authorization: Bearer <token>. On success set req.user = { username }.
 * On failure return 401 with access-restricted message (no other help).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      message: 'Authentication required. Please provide username and password.',
    });
  }
  req.user = { username: payload.username };
  next();
}

export { requireAuth };
