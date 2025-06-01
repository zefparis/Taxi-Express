/**
 * Fraud Routes for Taxi-Express
 * Handles fraud scoring, logs, blocking
 */

const express = require('express');
const router = express.Router();
const fraudController = require('../controllers/fraud.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { authorize } = require('../middlewares/authorization.middleware');

/**
 * @route GET /api/fraud/logs
 * @description Get fraud logs (admin only)
 * @access Private/Admin
 */
router.get('/logs', authenticate, authorize('admin'), fraudController.getFraudLogs);

/**
 * @route GET /api/fraud/logs/:logId
 * @description Get fraud log details (admin only)
 * @access Private/Admin
 */
router.get('/logs/:logId', authenticate, authorize('admin'), fraudController.getFraudLogDetails);

/**
 * @route PUT /api/fraud/logs/:logId/review
 * @description Review fraud log (admin only)
 * @access Private/Admin
 */
router.put('/logs/:logId/review', authenticate, authorize('admin'), validateInput('reviewFraudLog'), fraudController.reviewFraudLog);

/**
 * @route GET /api/fraud/users/:userId/risk
 * @description Get user risk assessment (admin only)
 * @access Private/Admin
 */
router.get('/users/:userId/risk', authenticate, authorize('admin'), fraudController.getUserRiskAssessment);

/**
 * @route PUT /api/fraud/users/:userId/block
 * @description Block user for fraud (admin only)
 * @access Private/Admin
 */
router.put('/users/:userId/block', authenticate, authorize('admin'), validateInput('blockUser'), fraudController.blockUser);

/**
 * @route PUT /api/fraud/users/:userId/unblock
 * @description Unblock user (admin only)
 * @access Private/Admin
 */
router.put('/users/:userId/unblock', authenticate, authorize('admin'), validateInput('unblockUser'), fraudController.unblockUser);

/**
 * @route PUT /api/fraud/users/:userId/reset-score
 * @description Reset user fraud score (admin only)
 * @access Private/Admin
 */
router.put('/users/:userId/reset-score', authenticate, authorize('admin'), fraudController.resetFraudScore);

/**
 * @route GET /api/fraud/statistics
 * @description Get fraud statistics (admin only)
 * @access Private/Admin
 */
router.get('/statistics', authenticate, authorize('admin'), fraudController.getFraudStatistics);

/**
 * @route POST /api/fraud/rules
 * @description Create fraud detection rule (admin only)
 * @access Private/Admin
 */
router.post('/rules', authenticate, authorize('admin'), validateInput('createFraudRule'), fraudController.createFraudRule);

/**
 * @route GET /api/fraud/rules
 * @description Get fraud detection rules (admin only)
 * @access Private/Admin
 */
router.get('/rules', authenticate, authorize('admin'), fraudController.getFraudRules);

/**
 * @route PUT /api/fraud/rules/:ruleId
 * @description Update fraud detection rule (admin only)
 * @access Private/Admin
 */
router.put('/rules/:ruleId', authenticate, authorize('admin'), validateInput('updateFraudRule'), fraudController.updateFraudRule);

/**
 * @route DELETE /api/fraud/rules/:ruleId
 * @description Delete fraud detection rule (admin only)
 * @access Private/Admin
 */
router.delete('/rules/:ruleId', authenticate, authorize('admin'), fraudController.deleteFraudRule);

/**
 * @route POST /api/fraud/check
 * @description Manual fraud check (admin only)
 * @access Private/Admin
 */
router.post('/check', authenticate, authorize('admin'), validateInput('manualFraudCheck'), fraudController.manualFraudCheck);

module.exports = router;
