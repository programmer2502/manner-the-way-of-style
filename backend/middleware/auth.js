// middleware/auth.js — JWT verification middleware
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // Bypass authentication if running in local database mode
  if (process.env.DB_MODE === 'local') {
    req.admin = { id: 'local-admin-id', email: 'admin@manner.com', name: 'Local Administrator' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth };
