/**
 * Error Handler Middleware for Taxi-Express
 * Centralized error handling for consistent API responses
 */

const { ValidationError } = require('sequelize');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a new API error
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Array} errors - Array of specific errors
 * @returns {ApiError} New API error
 */
exports.createError = (statusCode, message, errors = []) => {
  return new ApiError(statusCode, message, errors);
};

/**
 * Not found error handler - for routes that don't exist
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.notFound = (req, res, next) => {
  const error = new ApiError(404, `Resource not found - ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.errorHandler = (err, req, res, next) => {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user ? req.user.id : 'unauthenticated'
  });

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors || [];

  // Handle Sequelize validation errors
  if (err instanceof ValidationError) {
    statusCode = 400;
    message = 'Validation error';
    errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle Joi validation errors (should be caught by inputValidation middleware)
  if (err.isJoi) {
    statusCode = 400;
    message = 'Validation error';
    errors = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
    const field = Object.keys(err.keyValue)[0];
    errors = [{
      field,
      message: `${field} already exists`
    }];
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

/**
 * Async handler to catch async errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
exports.asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Export ApiError class
 */
exports.ApiError = ApiError;
