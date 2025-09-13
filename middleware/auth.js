const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth middleware - Debug:', {
    hasAuthHeader: !!authHeader,
    tokenLength: token ? token.length : 0,
    tokenStart: token ? token.substring(0, 20) + '...' : 'none'
  });

  if (!token) {
    console.log('❌ Auth middleware - No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Auth middleware - Token verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }
    console.log('✅ Auth middleware - Token verified, user:', {
      userId: user.userId,
      email: user.email
    });
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
