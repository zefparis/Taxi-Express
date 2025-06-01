/**
 * Pricing Routes for Taxi-Express
 * Handles price estimation, promotions, pricing history
 */

const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricing.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateInput } = require('../middlewares/inputValidation.middleware');
const { authorize } = require('../middlewares/authorization.middleware');

/**
 * @route POST /api/pricing/estimate
 * @description Calculate trip price estimate
 * @access Public
 */
router.post('/estimate', validateInput('estimatePrice'), pricingController.calculateTripPrice);

/**
 * @route GET /api/pricing/surge
 * @description Get current surge pricing factors by area
 * @access Public
 */
router.get('/surge', pricingController.getSurgePricing);

/**
 * @route GET /api/pricing/rates
 * @description Get base pricing rates for all vehicle types
 * @access Public
 */
router.get('/rates', pricingController.getPricingRates);

/**
 * @route POST /api/pricing/validate-promo
 * @description Validate a promotion code
 * @access Private
 */
router.post('/validate-promo', authenticate, validateInput('validatePromoCode'), pricingController.validatePromoCode);

/**
 * @route GET /api/pricing/promotions
 * @description Get available promotions for user
 * @access Private
 */
router.get('/promotions', authenticate, pricingController.getAvailablePromotions);

/**
 * @route POST /api/pricing/promotions
 * @description Create a new promotion (admin only)
 * @access Private/Admin
 */
router.post('/promotions', authenticate, authorize('admin'), validateInput('createPromotion'), pricingController.createPromotion);

/**
 * @route PUT /api/pricing/promotions/:promoId
 * @description Update a promotion (admin only)
 * @access Private/Admin
 */
router.put('/promotions/:promoId', authenticate, authorize('admin'), validateInput('updatePromotion'), pricingController.updatePromotion);

/**
 * @route DELETE /api/pricing/promotions/:promoId
 * @description Delete a promotion (admin only)
 * @access Private/Admin
 */
router.delete('/promotions/:promoId', authenticate, authorize('admin'), pricingController.deletePromotion);

/**
 * @route GET /api/pricing/history
 * @description Get pricing history (admin only)
 * @access Private/Admin
 */
router.get('/history', authenticate, authorize('admin'), pricingController.getPricingHistory);

/**
 * @route PUT /api/pricing/rates
 * @description Update pricing rates (admin only)
 * @access Private/Admin
 */
router.put('/rates', authenticate, authorize('admin'), validateInput('updatePricingRates'), pricingController.updatePricingRates);

/**
 * @route GET /api/pricing/statistics
 * @description Get pricing statistics (admin only)
 * @access Private/Admin
 */
router.get('/statistics', authenticate, authorize('admin'), pricingController.getPricingStatistics);

/**
 * @route POST /api/pricing/driver-earnings
 * @description Calculate driver earnings for a trip
 * @access Private
 */
router.post('/driver-earnings', authenticate, validateInput('calculateDriverEarnings'), pricingController.calculateDriverEarnings);

module.exports = router;
