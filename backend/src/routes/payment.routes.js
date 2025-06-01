/**
 * Payment Routes for Taxi-Express
 * Handles payment initialization, confirmation, wallet management
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { authorize } = require('../middlewares/authorization.middleware');
const { rateLimiter } = require('../middlewares/rateLimit.middleware');

/**
 * @route POST /api/payments/process
 * @description Process payment for a trip
 * @access Private
 */
router.post('/process', authenticate, rateLimiter({ windowMs: 5 * 60 * 1000, max: 10 }), validateInput('processPayment'), paymentController.processPayment);

/**
 * @route POST /api/payments/wallet/add
 * @description Add funds to wallet
 * @access Private
 */
router.post('/wallet/add', authenticate, rateLimiter({ windowMs: 5 * 60 * 1000, max: 5 }), validateInput('addWalletFunds'), paymentController.addFundsToWallet);

/**
 * @route POST /api/payments/wallet/withdraw
 * @description Withdraw funds from wallet (driver only)
 * @access Private/Driver
 */
router.post('/wallet/withdraw', authenticate, authorize('driver'), rateLimiter({ windowMs: 60 * 60 * 1000, max: 3 }), validateInput('withdrawFunds'), paymentController.withdrawFunds);

/**
 * @route PUT /api/payments/withdrawals/:withdrawalId/process
 * @description Process withdrawal request (admin only)
 * @access Private/Admin
 */
router.put('/withdrawals/:withdrawalId/process', authenticate, authorize('admin'), validateInput('processWithdrawal'), paymentController.processWithdrawal);

/**
 * @route GET /api/payments/history
 * @description Get payment history
 * @access Private
 */
router.get('/history', authenticate, paymentController.getPaymentHistory);

/**
 * @route GET /api/payments/:paymentId
 * @description Get payment details
 * @access Private
 */
router.get('/:paymentId', authenticate, paymentController.getPaymentDetails);

/**
 * @route POST /api/payments/mobile-money/initialize
 * @description Initialize mobile money payment
 * @access Private
 */
router.post('/mobile-money/initialize', authenticate, rateLimiter({ windowMs: 5 * 60 * 1000, max: 5 }), validateInput('initializeMobileMoney'), paymentController.initializeMobileMoneyPayment);

/**
 * @route POST /api/payments/mobile-money/callback
 * @description Mobile money payment callback
 * @access Public
 */
router.post('/mobile-money/callback', paymentController.mobileMoneyCallback);

/**
 * @route POST /api/payments/card/initialize
 * @description Initialize card payment (Stripe)
 * @access Private
 */
router.post('/card/initialize', authenticate, rateLimiter({ windowMs: 5 * 60 * 1000, max: 5 }), validateInput('initializeCardPayment'), paymentController.initializeCardPayment);

/**
 * @route POST /api/payments/card/callback
 * @description Card payment callback
 * @access Public
 */
router.post('/card/callback', paymentController.cardPaymentCallback);

/**
 * @route GET /api/payments/methods
 * @description Get user's saved payment methods
 * @access Private
 */
router.get('/methods', authenticate, paymentController.getSavedPaymentMethods);

/**
 * @route POST /api/payments/methods
 * @description Add a new payment method
 * @access Private
 */
router.post('/methods', authenticate, validateInput('addPaymentMethod'), paymentController.addPaymentMethod);

/**
 * @route DELETE /api/payments/methods/:methodId
 * @description Delete a payment method
 * @access Private
 */
router.delete('/methods/:methodId', authenticate, paymentController.deletePaymentMethod);

module.exports = router;
