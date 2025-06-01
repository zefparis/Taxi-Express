/**
 * Driver Routes for Taxi-Express
 * Handles driver management, availability, documents, status, ratings, support
 */

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { authorize } = require('../middlewares/authorization.middleware');

/**
 * @route GET /api/drivers/available
 * @description Get available drivers within a radius
 * @access Private
 */
router.get('/available', authenticate, driverController.getAvailableDrivers);

/**
 * @route PUT /api/drivers/location
 * @description Update driver location
 * @access Private/Driver
 */
router.put('/location', authenticate, authorize('driver'), validateInput('updateLocation'), driverController.updateLocation);

/**
 * @route PUT /api/drivers/availability
 * @description Update driver availability status
 * @access Private/Driver
 */
router.put('/availability', authenticate, authorize('driver'), validateInput('updateAvailability'), driverController.updateAvailability);

/**
 * @route GET /api/drivers/profile
 * @description Get driver profile details
 * @access Private/Driver
 */
router.get('/profile', authenticate, authorize('driver'), driverController.getDriverDetails);

/**
 * @route PUT /api/drivers/verification
 * @description Update driver verification status (admin only)
 * @access Private/Admin
 */
router.put('/verification/:driverId', authenticate, authorize('admin'), validateInput('updateVerification'), driverController.updateVerificationStatus);

/**
 * @route GET /api/drivers/trips
 * @description Get driver trip history
 * @access Private/Driver
 */
router.get('/trips', authenticate, authorize('driver'), driverController.getDriverTripHistory);

/**
 * @route GET /api/drivers/earnings
 * @description Get driver earnings
 * @access Private/Driver
 */
router.get('/earnings', authenticate, authorize('driver'), driverController.getDriverEarnings);

/**
 * @route PUT /api/drivers/vehicle
 * @description Update driver vehicle information
 * @access Private/Driver
 */
router.put('/vehicle', authenticate, authorize('driver'), validateInput('updateVehicle'), driverController.updateVehicleInfo);

/**
 * @route POST /api/drivers/documents
 * @description Upload driver documents
 * @access Private/Driver
 */
router.post('/documents', authenticate, authorize('driver'), driverController.uploadDocuments);

/**
 * @route GET /api/drivers/documents
 * @description Get driver documents
 * @access Private/Driver
 */
router.get('/documents', authenticate, authorize('driver'), driverController.getDriverDocuments);

/**
 * @route GET /api/drivers/verification-status
 * @description Get driver verification status
 * @access Private/Driver
 */
router.get('/verification-status', authenticate, authorize('driver'), driverController.getVerificationStatus);

/**
 * @route POST /api/drivers/support/tickets
 * @description Create a new support ticket for driver
 * @access Private/Driver
 */
router.post('/support/tickets', authenticate, authorize('driver'), validateInput('createTicket'), driverController.createSupportTicket);

/**
 * @route GET /api/drivers/support/tickets
 * @description Get driver support tickets
 * @access Private/Driver
 */
router.get('/support/tickets', authenticate, authorize('driver'), driverController.getSupportTickets);

/**
 * @route GET /api/drivers/ratings
 * @description Get driver ratings
 * @access Private/Driver
 */
router.get('/ratings', authenticate, authorize('driver'), driverController.getDriverRatings);

/**
 * @route GET /api/drivers/:driverId
 * @description Get driver by ID (admin or specific driver)
 * @access Private
 */
router.get('/:driverId', authenticate, driverController.getDriverById);

/**
 * @route GET /api/drivers
 * @description Get all drivers (admin only)
 * @access Private/Admin
 */
router.get('/', authenticate, authorize('admin'), driverController.getAllDrivers);

module.exports = router;
