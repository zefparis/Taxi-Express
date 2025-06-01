/**
 * Matching Routes for Taxi-Express
 * Handles AI-based driver matching endpoints and statistics
 */

const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matching.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { authorize } = require('../middlewares/authorization.middleware');

/**
 * @route POST /api/matching/find-driver
 * @description Find optimal driver for a trip
 * @access Private
 */
router.post('/find-driver', authenticate, validateInput('findDriver'), matchingController.findOptimalDriver);

/**
 * @route GET /api/matching/drivers/:driverId/stats
 * @description Get matching statistics for a driver
 * @access Private
 */
router.get('/drivers/:driverId/stats', authenticate, matchingController.getDriverMatchingStats);

/**
 * @route GET /api/matching/clients/:clientId/stats
 * @description Get matching statistics for a client
 * @access Private
 */
router.get('/clients/:clientId/stats', authenticate, matchingController.getClientMatchingStats);

/**
 * @route GET /api/matching/trips/:tripId/score
 * @description Get matching score details for a specific trip
 * @access Private
 */
router.get('/trips/:tripId/score', authenticate, matchingController.getTripMatchingScore);

/**
 * @route GET /api/matching/statistics
 * @description Get overall matching statistics (admin only)
 * @access Private/Admin
 */
router.get('/statistics', authenticate, authorize('admin'), matchingController.getMatchingStatistics);

/**
 * @route PUT /api/matching/parameters
 * @description Update matching algorithm parameters (admin only)
 * @access Private/Admin
 */
router.put('/parameters', authenticate, authorize('admin'), validateInput('updateMatchingParameters'), matchingController.updateMatchingParameters);

/**
 * @route GET /api/matching/parameters
 * @description Get current matching algorithm parameters (admin only)
 * @access Private/Admin
 */
router.get('/parameters', authenticate, authorize('admin'), matchingController.getMatchingParameters);

/**
 * @route POST /api/matching/simulate
 * @description Simulate matching for testing (admin only)
 * @access Private/Admin
 */
router.post('/simulate', authenticate, authorize('admin'), validateInput('simulateMatching'), matchingController.simulateMatching);

/**
 * @route GET /api/matching/performance
 * @description Get matching algorithm performance metrics (admin only)
 * @access Private/Admin
 */
router.get('/performance', authenticate, authorize('admin'), matchingController.getMatchingPerformance);

module.exports = router;
