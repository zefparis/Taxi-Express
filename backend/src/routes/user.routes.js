/**
 * User Routes for Taxi-Express
 * Handles user profile management, history, ratings, wallet, support
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { authorize } = require('../middlewares/authorization.middleware');

/**
 * @route GET /api/users/profile
 * @description Get user profile
 * @access Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route PUT /api/users/profile
 * @description Update user profile
 * @access Private
 */
router.put('/profile', authenticate, validateInput('updateProfile'), userController.updateProfile);

/**
 * @route PUT /api/users/profile/photo
 * @description Update user profile photo
 * @access Private
 */
router.put('/profile/photo', authenticate, userController.updateProfilePhoto);

/**
 * @route GET /api/users/trips
 * @description Get user trip history
 * @access Private
 */
router.get('/trips', authenticate, userController.getTripHistory);

/**
 * @route GET /api/users/ratings
 * @description Get user ratings
 * @access Private
 */
router.get('/ratings', authenticate, userController.getUserRatings);

/**
 * @route GET /api/users/wallet
 * @description Get user wallet balance and transactions
 * @access Private
 */
router.get('/wallet', authenticate, userController.getWallet);

/**
 * @route GET /api/users/wallet/transactions
 * @description Get user wallet transactions
 * @access Private
 */
router.get('/wallet/transactions', authenticate, userController.getWalletTransactions);

/**
 * @route POST /api/users/wallet/topup
 * @description Add funds to user wallet
 * @access Private
 */
router.post('/wallet/topup', authenticate, validateInput('walletTopup'), userController.topupWallet);

/**
 * @route POST /api/users/support/tickets
 * @description Create a new support ticket
 * @access Private
 */
router.post('/support/tickets', authenticate, validateInput('createTicket'), userController.createSupportTicket);

/**
 * @route GET /api/users/support/tickets
 * @description Get user support tickets
 * @access Private
 */
router.get('/support/tickets', authenticate, userController.getSupportTickets);

/**
 * @route GET /api/users/support/tickets/:ticketId
 * @description Get a specific support ticket
 * @access Private
 */
router.get('/support/tickets/:ticketId', authenticate, userController.getSupportTicketById);

/**
 * @route POST /api/users/support/tickets/:ticketId/messages
 * @description Add a message to a support ticket
 * @access Private
 */
router.post('/support/tickets/:ticketId/messages', authenticate, validateInput('addTicketMessage'), userController.addTicketMessage);

/**
 * @route PUT /api/users/notification-preferences
 * @description Update user notification preferences
 * @access Private
 */
router.put('/notification-preferences', authenticate, validateInput('updateNotificationPreferences'), userController.updateNotificationPreferences);

/**
 * @route GET /api/users/favorites
 * @description Get user favorite locations
 * @access Private
 */
router.get('/favorites', authenticate, userController.getFavoriteLocations);

/**
 * @route POST /api/users/favorites
 * @description Add a favorite location
 * @access Private
 */
router.post('/favorites', authenticate, validateInput('addFavoriteLocation'), userController.addFavoriteLocation);

/**
 * @route DELETE /api/users/favorites/:locationId
 * @description Delete a favorite location
 * @access Private
 */
router.delete('/favorites/:locationId', authenticate, userController.deleteFavoriteLocation);

/**
 * @route GET /api/users/:userId
 * @description Get user by ID (admin only)
 * @access Private/Admin
 */
router.get('/:userId', authenticate, authorize('admin'), userController.getUserById);

module.exports = router;
