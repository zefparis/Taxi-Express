/**
 * Rate Limiting Middleware for Taxi-Express
 * Protects against brute force attacks and API abuse
 */

const rateLimit = require('express-rate-limit');

// Note: Redis store implementation is commented out for now to simplify development
// In production, we would use Redis for rate limiting, but for now we'll use memory store
// const { createClient } = require('redis');
// const RedisStore = require('rate-limit-redis');

// Redis client for production - disabled for now
// let redisClient;
// let redisStore;

// Only initialize Redis in production - disabled for now
/*
if (process.env.NODE_ENV === 'production') {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
      console.warn('Falling back to memory store for rate limiting');
    });
    
    // Create Redis store for rate limiting
    redisStore = new RedisStore({
      client: redisClient
    });
  } catch (error) {
    console.error('Redis initialization error:', error);
    console.warn('Falling back to memory store for rate limiting');
  }
}
*/

// For now, we'll use a simple console message to indicate we're in development mode
console.log('Rate limiting: Using memory store (Redis disabled for development)');

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.message - Error message
 * @returns {Function} Express middleware function
 */
exports.rateLimiter = (options) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      success: false,
      message: 'Too many requests, please try again later.'
    }
  };
  
  // Merge default options with provided options
  const limiterOptions = { ...defaultOptions, ...options };
  
  // Redis store is disabled for now
  // if (process.env.NODE_ENV === 'production' && redisStore) {
  //   limiterOptions.store = redisStore;
  // }
  
  return rateLimit(limiterOptions);
};

/**
 * Predefined rate limiters for common scenarios
 */

// Auth rate limiter (login, register, etc.)
exports.authLimiter = exports.rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// SMS verification rate limiter
exports.smsLimiter = exports.rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    success: false,
    message: 'Too many SMS verification requests, please try again later.'
  }
});

// Payment rate limiter
exports.paymentLimiter = exports.rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.'
  }
});

// API rate limiter for general endpoints
exports.apiLimiter = exports.rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Strict rate limiter for sensitive operations
exports.strictLimiter = exports.rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later.'
  }
});
