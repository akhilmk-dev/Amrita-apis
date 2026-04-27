import { verifyAccessToken } from '../utils/jwt.utils.js';

/**
 * Authentication Middleware
 * Validates the JWT Access Token in the Authorization header
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired access token.',
    });
  }

  // Attach decoded user info to the request object
  req.user = decoded;
  next();
};

export default authMiddleware;
