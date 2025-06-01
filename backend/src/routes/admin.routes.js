/**
 * Admin Routes for Taxi-Express
 * Handles dashboard, account management, statistics, logs, settings
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { authorize } = require('../middlewares/authorization.middleware');

/**
 * @route GET /api/admin/dashboard
 * @description Get admin dashboard statistics
 * @access Private/Admin
 */
router.get('/dashboard', authenticate, authorize('admin'), adminController.getDashboardStats);

/**
 * @route GET /api/admin/users
 * @description Get all users with filters
 * @access Private/Admin
 */
router.get('/users', authenticate, authorize('admin'), adminController.getUsers);

/**
 * @route GET /api/admin/users/:userId
 * @description Get detailed user information
 * @access Private/Admin
 */
router.get('/users/:userId', authenticate, authorize('admin'), adminController.getUserDetails);

/**
 * @route PUT /api/admin/users/:userId/status
 * @description Update user status (activate/deactivate)
 * @access Private/Admin
 */
router.put('/users/:userId/status', authenticate, authorize('admin'), validateInput('updateUserStatus'), adminController.updateUserStatus);

/**
 * @route POST /api/admin/users/:userId/reset-password
 * @description Reset user password
 * @access Private/Admin
 */
router.post('/users/:userId/reset-password', authenticate, authorize('admin'), adminController.resetUserPassword);

/**
 * @route GET /api/admin/drivers/verification
 * @description Get pending driver verifications
 * @access Private/Admin
 */
router.get('/drivers/verification', authenticate, authorize('admin'), adminController.getPendingDriverVerifications);

/**
 * @route PUT /api/admin/drivers/:driverId/verification
 * @description Update driver verification status
 * @access Private/Admin
 */
router.put('/drivers/:driverId/verification', authenticate, authorize('admin'), validateInput('updateDriverVerification'), adminController.updateDriverVerification);

/**
 * @route GET /api/admin/logs
 * @description Get admin logs
 * @access Private/Admin
 */
router.get('/logs', authenticate, authorize('admin'), adminController.getAdminLogs);

/**
 * @route GET /api/admin/fraud/logs
 * @description Get fraud logs
 * @access Private/Admin
 */
router.get('/fraud/logs', authenticate, authorize('admin'), adminController.getFraudLogs);

/**
 * @route PUT /api/admin/fraud/logs/:logId/review
 * @description Review and update fraud log
 * @access Private/Admin
 */
router.put('/fraud/logs/:logId/review', authenticate, authorize('admin'), validateInput('reviewFraudLog'), adminController.reviewFraudLog);

/**
 * @route GET /api/admin/trips
 * @description Get all trips with filters
 * @access Private/Admin
 */
router.get('/trips', authenticate, authorize('admin'), adminController.getAllTrips);

/**
 * @route GET /api/admin/payments
 * @description Get all payments with filters
 * @access Private/Admin
 */
router.get('/payments', authenticate, authorize('admin'), adminController.getAllPayments);

/**
 * @route GET /api/admin/withdrawals
 * @description Get all withdrawal requests
 * @access Private/Admin
 */
router.get('/withdrawals', authenticate, authorize('admin'), adminController.getWithdrawalRequests);

/**
 * @route GET /api/admin/system-health
 * @description Get system health metrics
 * @access Private/Admin
 */
router.get('/system-health', authenticate, authorize('admin'), adminController.getSystemHealth);

/**
 * @route GET /api/admin/settings
 * @description Get system settings
 * @access Private/Admin
 */
router.get('/settings', authenticate, authorize('admin'), adminController.getSystemSettings);

/**
 * @route PUT /api/admin/settings
 * @description Update system settings
 * @access Private/Admin
 */
router.put('/settings', authenticate, authorize('admin'), validateInput('updateSystemSettings'), adminController.updateSystemSettings);

/**
 * @route POST /api/admin/notifications
 * @description Send notifications to users
 * @access Private/Admin
 */
router.post('/notifications', authenticate, authorize('admin'), validateInput('sendNotifications'), adminController.sendNotifications);

/**
 * @route GET /api/admin/reports
 * @description Generate admin reports
 * @access Private/Admin
 */
router.get('/reports', authenticate, authorize('admin'), adminController.generateReports);

module.exports = router;
