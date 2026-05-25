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