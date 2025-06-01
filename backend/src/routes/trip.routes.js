/**
 * Trip Routes for Taxi-Express
 * Handles trip requests, tracking, status updates, history, cross-ratings
 */

const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { authorize } = require('../middlewares/authorization.middleware');

/**
 * @route POST /api/trips/request
 * @description Request a new trip
 * @access Private/Client
 */
router.post('/request', authenticate, authorize('client'), validateInput('requestTrip'), tripController.requestTrip);

/**
 * @route PUT /api/trips/:tripId/accept
 * @description Accept a trip (driver only)
 * @access Private/Driver
 */
router.put('/:tripId/accept', authenticate, authorize('driver'), tripController.acceptTrip);

/**
 * @route PUT /api/trips/:tripId/start
 * @description Start a trip
 * @access Private/Driver
 */
router.put('/:tripId/start', authenticate, authorize('driver'), tripController.startTrip);

/**
 * @route PUT /api/trips/:tripId/complete
 * @description Complete a trip
 * @access Private/Driver
 */
router.put('/:tripId/complete', authenticate, authorize('driver'), validateInput('completeTrip'), tripController.completeTrip);

/**
 * @route PUT /api/trips/:tripId/cancel
 * @description Cancel a trip
 * @access Private
 */
router.put('/:tripId/cancel', authenticate, validateInput('cancelTrip'), tripController.cancelTrip);

/**
 * @route GET /api/trips/:tripId
 * @description Get trip details
 * @access Private
 */
router.get('/:tripId', authenticate, tripController.getTripDetails);

/**
 * @route POST /api/trips/:tripId/incidents
 * @description Report a trip incident
 * @access Private
 */
router.post('/:tripId/incidents', authenticate, validateInput('reportIncident'), tripController.reportIncident);

/**
 * @route POST /api/trips/:tripId/rate-driver
 * @description Rate a driver after trip completion
 * @access Private/Client
 */
router.post('/:tripId/rate-driver', authenticate, authorize('client'), validateInput('rateDriver'), tripController.rateDriver);

/**
 * @route POST /api/trips/:tripId/rate-client
 * @description Rate a client after trip completion
 * @access Private/Driver
 */
router.post('/:tripId/rate-client', authenticate, authorize('driver'), validateInput('rateClient'), tripController.rateClient);

/**
 * @route GET /api/trips/:tripId/tracking
 * @description Get real-time trip tracking information
 * @access Private
 */
router.get('/:tripId/tracking', authenticate, tripController.getTripTracking);

/**
 * @route PUT /api/trips/:tripId/extend
 * @description Extend trip with additional stops
 * @access Private/Client
 */
router.put('/:tripId/extend', authenticate, authorize('client'), validateInput('extendTrip'), tripController.extendTrip);

/**
 * @route GET /api/trips
 * @description Get all trips (admin only)
 * @access Private/Admin
 */
router.get('/', authenticate, authorize('admin'), tripController.getAllTrips);

/**
 * @route GET /api/trips/active
 * @description Get user's active trip
 * @access Private
 */
router.get('/active', authenticate, tripController.getActiveTrip);

/**
 * @route POST /api/trips/:tripId/sos
 * @description Trigger SOS alert for a trip
 * @access Private
 */
router.post('/:tripId/sos', authenticate, tripController.triggerSOS);

module.exports = router;
