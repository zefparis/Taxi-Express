/**
 * Notification Routes for Taxi-Express
 * Handles notification management, delivery, and preferences
 */

const express = require('express');
const router = express.Router();
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { rateLimiter } = require('../middlewares/rateLimit.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/auth.middleware');

// Import notification controller
const notificationController = require('../controllers/notification.controller');


/**
 * @route GET /api/notifications
 * @description Get user notifications
 * @access Private
 */
router.get('/', authenticate, notificationController.getUserNotifications);

/**
 * @route PUT /api/notifications/:id/read
 * @description Mark notification as read
 * @access Private
 */
router.put('/:id/read', authenticate, notificationController.markAsRead);

/**
 * @route PUT /api/notifications/preferences
 * @description Update notification preferences
 * @access Private
 */
router.put('/preferences', authenticate, validateInput('updateNotificationPreferences'), notificationController.updateNotificationPreferences);

/**
 * @route PUT /api/notifications/read-all
 * @description Mark all notifications as read
 * @access Private
 */
router.put('/read-all', authenticate, notificationController.markAllAsRead);

/**
 * @route DELETE /api/notifications/:id
 * @description Delete a notification
 * @access Private
 */
router.delete('/:id', authenticate, notificationController.deleteNotification);

/**
 * @route GET /api/notifications/count
 * @description Get notification count
 * @access Private
 */
router.get('/count', authenticate, notificationController.getNotificationCount);

/**
 * @route POST /api/notifications/send
 * @description Send a notification (admin only)
 * @access Admin
 */
router.post('/send', authenticate, authorize('admin'), notificationController.sendNotification);

module.exports = router;
