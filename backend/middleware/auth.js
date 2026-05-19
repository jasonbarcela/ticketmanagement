// ============================================================
// middleware/auth.js — Session Auth & Role Authorization
//
// requireAuth:  Validates the X-User header (JSON-encoded
//   session payload set by the frontend on login). Attaches
//   req.user = { username, role } for downstream controllers.
//
// requireRole:  Factory that returns a middleware asserting
//   the authenticated user holds one of the allowed roles.
//   Usage: router.delete('/:id', requireAuth, requireRole(['admin']))
//
// Note: For a prototype, auth state lives in localStorage on
// the frontend and is passed as a request header. A production
// build would use signed JWTs or server-side sessions.
// ============================================================

/**
 * Validates the X-User session header attached by the frontend.
 * Rejects with 401 if missing or malformed.
 */
function requireAuth(req, res, next) {
  const raw = req.headers['x-user'];
  if (!raw) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  try {
    const user = JSON.parse(raw);
    if (!user?.username || !user?.role) {
      return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Malformed session header.' });
  }
}

/**
 * Returns a middleware that gates access to specific roles.
 * @param {string[]} allowedRoles - Array of roles permitted to proceed.
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
