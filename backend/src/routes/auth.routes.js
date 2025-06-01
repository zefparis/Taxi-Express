/**
 * Authentication Routes for Taxi-Express
 * Handles user registration, login, token refresh, password reset
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { rateLimiter } = require('../middlewares/rateLimit.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * @route POST /api/auth/register
 * @description Register a new user (client or driver)
 * @access Public
 */
router.post('/register', validateInput('register'), authController.register);

/**
 * @route POST /api/auth/login
 * @description Authenticate user and get token
 * @access Public
 */
router.post('/login', rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), validateInput('login'), authController.login);

/**
 * @route POST /api/auth/refresh
 * @description Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', validateInput('refreshToken'), authController.refreshToken);

/**
 * @route POST /api/auth/forgot-password
 * @description Request password reset (sends code via SMS/email)
 * @access Public
 */
router.post('/forgot-password', rateLimiter({ windowMs: 60 * 60 * 1000, max: 3 }), validateInput('forgotPassword'), authController.forgotPassword);

/**
 * @route POST /api/auth/reset-password
 * @description Reset password using verification code
 * @access Public
 */
router.post('/reset-password', rateLimiter({ windowMs: 60 * 60 * 1000, max: 3 }), validateInput('resetPassword'), authController.resetPassword);

/**
 * @route POST /api/auth/verify-email
 * @description Verify user email address
 * @access Public
 */
router.post('/verify-email', validateInput('verifyEmail'), authController.verifyEmail);

/**
 * @route POST /api/auth/verify-phone
 * @description Verify user phone number
 * @access Public
 */
router.post('/verify-phone', validateInput('verifyPhone'), authController.verifyPhone);

/**
 * @route POST /api/auth/logout
 * @description Logout user (invalidate token)
 * @access Private
 */
router.post('/logout', authController.logout);

/**
 * @route GET /api/auth/me
 * @description Get current user profile
 * @access Private
 */
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
