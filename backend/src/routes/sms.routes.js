/**
 * SMS Routes for Taxi-Express
 * Handles SMS, push notifications, and email notifications
 */

const express = require('express');
const router = express.Router();
const smsController = require('../controllers/sms.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { authorize } = require('../middlewares/authorization.middleware');
const { rateLimiter } = require('../middlewares/rateLimit.middleware');

/**
 * @route POST /api/sms/send
 * @description Send SMS to a user (admin only)
 * @access Private/Admin
 */
router.post('/send', authenticate, authorize('admin'), rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }), validateInput('sendSms'), smsController.sendSms);

/**
 * @route POST /api/sms/send-bulk
 * @description Send bulk SMS to multiple users (admin only)
 * @access Private/Admin
 */
router.post('/send-bulk', authenticate, authorize('admin'), rateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }), validateInput('sendBulkSms'), smsController.sendBulkSms);

/**
 * @route GET /api/sms/logs
 * @description Get SMS logs (admin only)
 * @access Private/Admin
 */
router.get('/logs', authenticate, authorize('admin'), smsController.getSmsLogs);

/**
 * @route GET /api/sms/statistics
 * @description Get SMS delivery statistics (admin only)
 * @access Private/Admin
 */
router.get('/statistics', authenticate, authorize('admin'), smsController.getSmsStatistics);

/**
 * @route POST /api/sms/verify
 * @description Send verification SMS
 * @access Private
 */
router.post('/verify', authenticate, rateLimiter({ windowMs: 15 * 60 * 1000, max: 3 }), validateInput('sendVerificationSms'), smsController.sendVerificationSms);

/**
 * @route POST /api/sms/push
 * @description Send push notification to a user (admin only)
 * @access Private/Admin
 */
router.post('/push', authenticate, authorize('admin'), validateInput('sendPushNotification'), smsController.sendPushNotification);

/**
 * @route POST /api/sms/push-bulk
 * @description Send bulk push notifications (admin only)
 * @access Private/Admin
 */
router.post('/push-bulk', authenticate, authorize('admin'), validateInput('sendBulkPushNotification'), smsController.sendBulkPushNotification);

/**
 * @route POST /api/sms/email
 * @description Send email to a user (admin only)
 * @access Private/Admin
 */
router.post('/email', authenticate, authorize('admin'), validateInput('sendEmail'), smsController.sendEmail);

/**
 * @route POST /api/sms/email-bulk
 * @description Send bulk email to multiple users (admin only)
 * @access Private/Admin
 */
router.post('/email-bulk', authenticate, authorize('admin'), validateInput('sendBulkEmail'), smsController.sendBulkEmail);

/**
 * @route GET /api/sms/templates
 * @description Get notification templates (admin only)
 * @access Private/Admin
 */
router.get('/templates', authenticate, authorize('admin'), smsController.getNotificationTemplates);

/**
 * @route PUT /api/sms/templates/:templateId
 * @description Update notification template (admin only)
 * @access Private/Admin
 */
router.put('/templates/:templateId', authenticate, authorize('admin'), validateInput('updateNotificationTemplate'), smsController.updateNotificationTemplate);

/**
 * @route POST /api/sms/test
 * @description Test notification delivery (admin only)
 * @access Private/Admin
 */
router.post('/test', authenticate, authorize('admin'), validateInput('testNotification'), smsController.testNotification);

module.exports = router;
