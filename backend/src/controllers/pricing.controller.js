/**
 * Pricing Controller for Taxi-Express
 */
const { PricingRate, Promotion, PricingHistory, Trip } = require('../models');
const { createAdminLog } = require('../services/admin.service');
const { Op } = require('sequelize');

/**
 * Calculate trip price
 * @route POST /api/pricing/estimate
 */
exports.calculateTripPrice = async (req, res) => {
  try {
    const { distance, duration, vehicleType = 'standard', time, promoCode } = req.body;
    
    if (!distance || !duration) {
      return res.status(400).json({ success: false, message: 'Distance and duration are required' });
    }

    // Get current pricing rates
    const rates = await PricingRate.findOne({
      where: { vehicleType },
      order: [['effectiveDate', 'DESC']]
    });

    if (!rates) {
      return res.status(404).json({ success: false, message: 'Pricing rates not found' });
    }

    // Calculate base price
    let basePrice = rates.baseFare + (rates.perKilometer * distance) + (rates.perMinute * duration);
    
    // Apply surge pricing if applicable
    let surgeMultiplier = 1;
    if (time) {
      const hour = new Date(time).getHours();
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        surgeMultiplier = rates.peakHourSurge || 1.5;
      } else if (hour >= 22 || hour <= 5) {
        surgeMultiplier = rates.nightSurge || 1.25;
      }
    }
    
    let price = basePrice * surgeMultiplier;
    if (price < rates.minimumFare) price = rates.minimumFare;

    // Apply promo code if provided
    let discount = 0;
    let promoDetails = null;
    
    if (promoCode) {
      const promo = await Promotion.findOne({
        where: {
          code: promoCode,
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() }
        }
      });
      
      if (promo) {
        if (promo.discountType === 'percentage') {
          discount = price * (promo.discountValue / 100);
          if (promo.maxDiscount && discount > promo.maxDiscount) {
            discount = promo.maxDiscount;
          }
        } else {
          discount = promo.discountValue;
        }
        promoDetails = { code: promo.code, description: promo.description, appliedDiscount: discount };
      }
    }
    
    const finalPrice = Math.max(0, price - discount);
    
    res.status(200).json({
      success: true,
      data: {
        finalPrice: Math.round(finalPrice * 100) / 100,
        currency: 'XOF',
        breakdown: { baseFare: rates.baseFare, distance, duration, surge: surgeMultiplier },
        promo: promoDetails
      }
    });
  } catch (error) {
    console.error('Calculate trip price error:', error);
    res.status(500).json({ success: false, message: 'Error calculating trip price' });
  }
};

/**
 * Get current surge pricing
 * @route GET /api/pricing/surge
 */
exports.getSurgePricing = async (req, res) => {
  try {
    const now = new Date();
    const hour = now.getHours();
    
    const rates = await PricingRate.findAll({
      attributes: ['vehicleType', 'peakHourSurge', 'nightSurge'],
      order: [['effectiveDate', 'DESC']]
    });

    let surgeType = 'none';
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      surgeType = 'peak';
    } else if (hour >= 22 || hour <= 5) {
      surgeType = 'night';
    }

    const surgeData = rates.map(rate => {
      let multiplier = 1;
      if (surgeType === 'peak') multiplier = rate.peakHourSurge || 1.5;
      else if (surgeType === 'night') multiplier = rate.nightSurge || 1.25;
      
      return {
        vehicleType: rate.vehicleType,
        surgeMultiplier: multiplier
      };
    });

    res.status(200).json({ success: true, data: { currentTime: now, surgeType, surgeByVehicleType: surgeData } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching surge pricing' });
  }
};

/**
 * Get current pricing rates
 * @route GET /api/pricing/rates
 */
exports.getPricingRates = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const whereConditions = vehicleType ? { vehicleType } : {};

    const rates = await PricingRate.findAll({
      where: whereConditions,
      order: [['vehicleType', 'ASC'], ['effectiveDate', 'DESC']]
    });

    const latestRatesByType = {};
    rates.forEach(rate => {
      if (!latestRatesByType[rate.vehicleType] || 
          new Date(rate.effectiveDate) > new Date(latestRatesByType[rate.vehicleType].effectiveDate)) {
        latestRatesByType[rate.vehicleType] = rate;
      }
    });

    res.status(200).json({ success: true, data: Object.values(latestRatesByType) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pricing rates' });
  }
};

/**
 * Validate promo code
 * @route POST /api/pricing/validate-promo
 */
exports.validatePromoCode = async (req, res) => {
  try {
    const { promoCode, tripDetails } = req.body;
    
    if (!promoCode) {
      return res.status(400).json({ success: false, message: 'Promo code is required' });
    }

    const promo = await Promotion.findOne({
      where: {
        code: promoCode,
        isActive: true,
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      }
    });

    if (!promo) {
      return res.status(404).json({ success: false, message: 'Invalid or expired promo code' });
    }

    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return res.status(400).json({ success: false, message: 'Promo code usage limit reached' });
    }

    let discount = 0;
    if (tripDetails && tripDetails.estimatedPrice) {
      if (promo.discountType === 'percentage') {
        discount = tripDetails.estimatedPrice * (promo.discountValue / 100);
        if (promo.maxDiscount && discount > promo.maxDiscount) discount = promo.maxDiscount;
      } else {
        discount = promo.discountValue;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        promoCode: promo.code,
        description: promo.description,
        calculatedDiscount: discount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error validating promo code' });
  }
};

/**
 * Get available promotions
 * @route GET /api/pricing/promotions
 */
exports.getAvailablePromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      }
    });

    res.status(200).json({ success: true, data: promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching promotions' });
  }
};

/**
 * Create promotion
 * @route POST /api/pricing/promotions
 */
exports.createPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.create({
      ...req.body,
      usageCount: 0,
      isActive: true,
      createdBy: req.user.id
    });

    await createAdminLog({
      adminId: req.user.id,
      action: 'promotion_created',
      targetType: 'promotion',
      targetId: promotion.id
    });

    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating promotion' });
  }
};

/**
 * Update promotion
 * @route PUT /api/pricing/promotions/:promoId
 */
exports.updatePromotion = async (req, res) => {
  try {
    const { promoId } = req.params;
    const promotion = await Promotion.findByPk(promoId);
    
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    await promotion.update({
      ...req.body,
      updatedBy: req.user.id
    });

    res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating promotion' });
  }
};

/**
 * Delete promotion
 * @route DELETE /api/pricing/promotions/:promoId
 */
exports.deletePromotion = async (req, res) => {
  try {
    const { promoId } = req.params;
    const promotion = await Promotion.findByPk(promoId);
    
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    promotion.isActive = false;
    promotion.updatedBy = req.user.id;
    await promotion.save();

    res.status(200).json({ success: true, message: 'Promotion deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting promotion' });
  }
};

/**
 * Get pricing history
 * @route GET /api/pricing/history
 */
exports.getPricingHistory = async (req, res) => {
  try {
    const history = await PricingHistory.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pricing history' });
  }
};

/**
 * Update pricing rates
 * @route PUT /api/pricing/rates
 */
exports.updatePricingRates = async (req, res) => {
  try {
    const { vehicleType, baseFare, perKilometer, perMinute, minimumFare, peakHourSurge, nightSurge } = req.body;
    
    const newRate = await PricingRate.create({
      vehicleType,
      baseFare,
      perKilometer,
      perMinute,
      minimumFare,
      peakHourSurge,
      nightSurge,
      effectiveDate: new Date(),
      createdBy: req.user.id
    });

    await PricingHistory.create({
      action: 'rate_updated',
      vehicleType,
      details: JSON.stringify(req.body),
      adminId: req.user.id
    });

    res.status(200).json({ success: true, data: newRate });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating pricing rates' });
  }
};

/**
 * Get pricing statistics
 * @route GET /api/pricing/statistics
 */
exports.getPricingStatistics = async (req, res) => {
  try {
    // Placeholder for pricing statistics
    const stats = {
      averageTripPrice: 5000,
      promoCodeUsage: 120,
      topPromoCodes: ['WELCOME', 'WEEKEND'],
      revenueByVehicleType: {
        standard: 2500000,
        premium: 1800000,
        suv: 950000
      }
    };
    
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pricing statistics' });
  }
};

/**
 * Calculate driver earnings
 * @route POST /api/pricing/driver-earnings
 */
exports.calculateDriverEarnings = async (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.body;
    
    // Get all completed trips for the driver in the date range
    const trips = await Trip.findAll({
      where: {
        driverId,
        status: 'completed',
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      }
    });
    
    // Calculate earnings
    let totalEarnings = 0;
    let totalTrips = trips.length;
    let totalDistance = 0;
    
    trips.forEach(trip => {
      totalEarnings += trip.driverEarnings || 0;
      totalDistance += trip.distance || 0;
    });
    
    res.status(200).json({
      success: true,
      data: {
        driverId,
        period: { startDate, endDate },
        totalEarnings,
        totalTrips,
        totalDistance,
        averageEarningsPerTrip: totalTrips > 0 ? totalEarnings / totalTrips : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error calculating driver earnings' });
  }
};
