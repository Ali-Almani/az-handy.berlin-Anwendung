import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (secret == null || String(secret).trim() === '') {
    console.error('authenticateToken: JWT_SECRET fehlt in .env');
    return res.status(503).json({
      message: 'Server nicht konfiguriert: JWT_SECRET fehlt. Administrator muss die .env prüfen.'
    });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  } catch (e) {
    console.error('authenticateToken verify:', e);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
