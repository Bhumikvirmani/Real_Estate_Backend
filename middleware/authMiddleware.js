import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

/**
 * Middleware to protect routes that require authentication
 * Verifies JWT token and attaches user to request object
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (for browser-based auth)
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // If no token found, return error
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token is about to expire and issue a new one if needed
      const tokenExp = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = tokenExp - now;

      // If token expires in less than 1 hour, issue a new one
      if (timeUntilExpiry < 60 * 60 * 1000) {
        // We'll handle token refresh in the response
        req.refreshToken = true;
      }

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      // If user not found, return error
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found or account has been deactivated.'
        });
      }

      // Attach user to request object
      req.user = user;
      req.userId = user._id;
      req.userRole = user.role;

      next();
    } catch (error) {
      // Handle different JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication token.'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please log in again.'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed. Please try again.'
        });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

/**
 * Middleware to authorize users based on roles
 * @param {...string} roles - Allowed roles for the route
 * @returns {Function} Express middleware function
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user exists (protect middleware should run first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user role is allowed
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized to access this resource.`
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require authentication
 */
export const optionalAuth = async (req, _res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // If no token, continue without authentication
    if (!token) {
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      // If user found, attach to request
      if (user) {
        req.user = user;
        req.userId = user._id;
        req.userRole = user.role;
      }
    } catch (error) {
      // Continue without authentication if token is invalid
      console.log('Optional auth token invalid:', error.message);
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without authentication
    next();
  }
};
