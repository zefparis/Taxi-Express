/**
 * Authentication Middleware for Taxi-Express
 * Validates JWT tokens and attaches user to request object
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Authenticate user based on JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Check if token is issued before password change
    if (decoded.iat < new Date(user.passwordChangedAt || 0) / 1000) {
      return res.status(401).json({
        success: false,
        message: 'Password has been changed. Please login again'
      });
    }

    // Attach user to request object
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token expired'
      });
    }
    
    console.error('Authentication error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Refresh token validation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user by ID
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Attach user to request object
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }
    
    console.error('Refresh token validation error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Refresh token validation error'
    });
  }
};

/**
 * Optional authentication - attaches user to request if token is valid, but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No token, but that's okay - continue without user
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID
    const user = await User.findByPk(decoded.id);
    
    if (user && user.isActive) {
      // Attach user to request object
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Token is invalid, but that's okay for optional auth - continue without user
    next();
  }
};
