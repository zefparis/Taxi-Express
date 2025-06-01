/**
 * Pricing Service for Taxi-Express
 * Handles trip price calculations, surge pricing, and promotions
 */

const { Trip, Promotion, User, Driver } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

/**
 * Calculate trip price based on distance, duration, and other factors
 * @param {Object} tripData - Trip data
 * @param {Object} tripData.pickupLocation - Pickup location coordinates
 * @param {Object} tripData.dropoffLocation - Dropoff location coordinates
 * @param {number} tripData.estimatedDistance - Estimated distance in kilometers
 * @param {number} tripData.estimatedDuration - Estimated duration in minutes
 * @param {string} [tripData.vehicleType='standard'] - Type of vehicle requested
 * @param {string} tripData.clientId - ID of the client
 * @param {string} [tripData.promoCode] - Promotion code if any
 * @returns {Promise<Object>} Price calculation result
 */
exports.calculateTripPrice = async (tripData) => {
  try {
    const {
      pickupLocation,
      dropoffLocation,
      estimatedDistance,
      estimatedDuration,
      vehicleType = 'standard',
      clientId,
      promoCode
    } = tripData;

    // Validate required fields
    if (!pickupLocation || !dropoffLocation || !estimatedDistance || !estimatedDuration || !clientId) {
      throw new Error('Missing required fields for price calculation');
    }

    // Get base rates for the vehicle type
    const baseRates = getBaseRates(vehicleType);

    // Calculate base price
    let basePrice = (baseRates.baseFare + 
                    (estimatedDistance * baseRates.perKilometer) + 
                    (estimatedDuration * baseRates.perMinute));

    // Apply surge pricing if applicable
    const surgeFactor = await calculateSurgeFactor(pickupLocation);
    const surgePrice = basePrice * surgeFactor;

    // Apply taxes
    const taxRate = 0.15; // 15% tax
    const taxAmount = surgePrice * taxRate;

    // Calculate subtotal before promotions
    const subtotal = surgePrice + taxAmount;

    // Apply promotion if valid
    let discountAmount = 0;
    let appliedPromotion = null;

    if (promoCode) {
      const promotionResult = await applyPromotion(promoCode, clientId, subtotal);
      discountAmount = promotionResult.discountAmount;
      appliedPromotion = promotionResult.promotion;
    }

    // Calculate final price
    const totalPrice = Math.max(0, subtotal - discountAmount);

    // Round to 2 decimal places
    const roundedTotal = Math.round(totalPrice * 100) / 100;

    return {
      success: true,
      basePrice: Math.round(basePrice * 100) / 100,
      surgeFactor,
      surgePrice: Math.round(surgePrice * 100) / 100,
      taxRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      totalPrice: roundedTotal,
      currency: 'XOF', // CFA Franc
      breakdown: {
        baseFare: baseRates.baseFare,
        distance: {
          value: estimatedDistance,
          unit: 'km',
          rate: baseRates.perKilometer,
          total: Math.round(estimatedDistance * baseRates.perKilometer * 100) / 100
        },
        duration: {
          value: estimatedDuration,
          unit: 'min',
          rate: baseRates.perMinute,
          total: Math.round(estimatedDuration * baseRates.perMinute * 100) / 100
        },
        surge: {
          factor: surgeFactor,
          amount: Math.round((surgePrice - basePrice) * 100) / 100
        },
        tax: {
          rate: taxRate,
          amount: Math.round(taxAmount * 100) / 100
        },
        discount: {
          code: promoCode || null,
          amount: Math.round(discountAmount * 100) / 100
        }
      },
      appliedPromotion: appliedPromotion ? {
        code: appliedPromotion.code,
        description: appliedPromotion.description
      } : null
    };
  } catch (error) {
    console.error('Price calculation error:', error);
    return {
      success: false,
      message: 'Error calculating trip price',
      error: error.message
    };
  }
};

/**
 * Get base rates for a vehicle type
 * @param {string} vehicleType - Type of vehicle
 * @returns {Object} Base rates
 */
function getBaseRates(vehicleType) {
  // These rates would typically come from a database
  // For now, we'll use hardcoded values
  const rates = {
    standard: {
      baseFare: 500, // XOF
      perKilometer: 200, // XOF per km
      perMinute: 50 // XOF per minute
    },
    premium: {
      baseFare: 1000,
      perKilometer: 300,
      perMinute: 75
    },
    suv: {
      baseFare: 800,
      perKilometer: 250,
      perMinute: 60
    },
    moto: {
      baseFare: 300,
      perKilometer: 150,
      perMinute: 30
    }
  };

  return rates[vehicleType] || rates.standard;
}

/**
 * Calculate surge factor based on demand in the area
 * @param {Object} location - Pickup location
 * @returns {Promise<number>} Surge factor (1.0 = no surge)
 */
async function calculateSurgeFactor(location) {
  try {
    // In a real implementation, this would:
    // 1. Check the number of active drivers in the area
    // 2. Check the number of pending trip requests in the area
    // 3. Consider time of day, weather, special events, etc.
    
    // For now, we'll use a simplified approach
    const now = new Date();
    const hour = now.getHours();
    
    // Rush hours: 7-9 AM and 5-7 PM
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    
    // Weekend: Saturday and Sunday
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    // Base surge factor
    let surgeFactor = 1.0;
    
    // Adjust for rush hour
    if (isRushHour) {
      surgeFactor += 0.3;
    }
    
    // Adjust for weekend
    if (isWeekend) {
      surgeFactor += 0.1;
    }
    
    // Adjust for late night (10 PM - 5 AM)
    if (hour >= 22 || hour <= 5) {
      surgeFactor += 0.2;
    }
    
    // Cap surge factor
    return Math.min(2.5, surgeFactor);
  } catch (error) {
    console.error('Surge calculation error:', error);
    return 1.0; // Default to no surge on error
  }
}

/**
 * Apply a promotion code to a trip
 * @param {string} promoCode - Promotion code
 * @param {string} clientId - ID of the client
 * @param {number} subtotal - Subtotal amount before discount
 * @returns {Promise<Object>} Promotion application result
 */
async function applyPromotion(promoCode, clientId, subtotal) {
  try {
    // Find the promotion
    const promotion = await Promotion.findOne({
      where: {
        code: promoCode,
        isActive: true,
        startDate: {
          [Op.lte]: new Date()
        },
        endDate: {
          [Op.gte]: new Date()
        }
      }
    });

    if (!promotion) {
      return {
        discountAmount: 0,
        promotion: null,
        message: 'Invalid or expired promotion code'
      };
    }

    // Check if client has already used this promotion
    if (promotion.oneTimeUse) {
      const usedPromotion = await UsedPromotion.findOne({
        where: {
          promotionId: promotion.id,
          clientId
        }
      });

      if (usedPromotion) {
        return {
          discountAmount: 0,
          promotion: null,
          message: 'Promotion code already used'
        };
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    
    if (promotion.discountType === 'percentage') {
      discountAmount = subtotal * (promotion.discountValue / 100);
    } else if (promotion.discountType === 'fixed') {
      discountAmount = promotion.discountValue;
    }
    
    // Apply maximum discount if specified
    if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
      discountAmount = promotion.maxDiscount;
    }

    // Apply minimum subtotal requirement
    if (promotion.minSubtotal && subtotal < promotion.minSubtotal) {
      return {
        discountAmount: 0,
        promotion: null,
        message: `Minimum subtotal of ${promotion.minSubtotal} required for this promotion`
      };
    }

    // Record promotion usage
    if (promotion.oneTimeUse) {
      await UsedPromotion.create({
        promotionId: promotion.id,
        clientId,
        usedAt: new Date(),
        discountAmount
      });
    }

    return {
      discountAmount,
      promotion,
      message: 'Promotion applied successfully'
    };
  } catch (error) {
    console.error('Promotion application error:', error);
    return {
      discountAmount: 0,
      promotion: null,
      message: 'Error applying promotion'
    };
  }
}

/**
 * Calculate driver earnings for a trip
 * @param {string} tripId - ID of the trip
 * @returns {Promise<Object>} Earnings calculation result
 */
exports.calculateDriverEarnings = async (tripId) => {
  try {
    // Get trip
    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      throw new Error(`Trip not found: ${tripId}`);
    }

    // Get driver
    const driver = await Driver.findByPk(trip.driverId);
    if (!driver) {
      throw new Error(`Driver not found: ${trip.driverId}`);
    }

    // Get base price (before taxes and promotions)
    const basePrice = trip.basePrice;
    
    // Calculate platform fee (percentage)
    const platformFeePercentage = driver.platformFeePercentage || 15; // Default 15%
    const platformFee = basePrice * (platformFeePercentage / 100);
    
    // Calculate driver earnings
    const driverEarnings = basePrice - platformFee;
    
    // Calculate any bonuses
    let bonusAmount = 0;
    
    // Example: Bonus for high-rated drivers
    if (driver.rating >= 4.8) {
      bonusAmount += basePrice * 0.05; // 5% bonus
    }
    
    // Example: Bonus for completing many trips
    if (driver.totalTrips >= 100) {
      bonusAmount += 100; // Fixed bonus
    }
    
    // Calculate total earnings
    const totalEarnings = driverEarnings + bonusAmount;

    return {
      success: true,
      tripId,
      driverId: trip.driverId,
      basePrice,
      platformFeePercentage,
      platformFee: Math.round(platformFee * 100) / 100,
      driverEarnings: Math.round(driverEarnings * 100) / 100,
      bonusAmount: Math.round(bonusAmount * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      currency: 'XOF'
    };
  } catch (error) {
    console.error('Driver earnings calculation error:', error);
    return {
      success: false,
      message: 'Error calculating driver earnings',
      error: error.message
    };
  }
};

/**
 * Get pricing statistics for admin dashboard
 * @param {Date} startDate - Start date for the statistics
 * @param {Date} endDate - End date for the statistics
 * @returns {Promise<Object>} Pricing statistics
 */
exports.getPricingStatistics = async (startDate, endDate) => {
  try {
    // Get trips in the date range
    const trips = await Trip.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        status: 'completed'
      },
      attributes: [
        'id',
        'basePrice',
        'surgeFactor',
        'taxAmount',
        'discountAmount',
        'finalPrice',
        'vehicleType',
        'createdAt'
      ]
    });

    // Calculate statistics
    const totalTrips = trips.length;
    
    // Average prices
    const avgBasePrice = totalTrips > 0
      ? trips.reduce((sum, trip) => sum + parseFloat(trip.basePrice || 0), 0) / totalTrips
      : 0;
    
    const avgFinalPrice = totalTrips > 0
      ? trips.reduce((sum, trip) => sum + parseFloat(trip.finalPrice || 0), 0) / totalTrips
      : 0;
    
    const avgSurgeFactor = totalTrips > 0
      ? trips.reduce((sum, trip) => sum + parseFloat(trip.surgeFactor || 1), 0) / totalTrips
      : 1;
    
    // Total revenue
    const totalRevenue = trips.reduce((sum, trip) => sum + parseFloat(trip.finalPrice || 0), 0);
    
    // Total platform fees
    const totalPlatformFees = trips.reduce((sum, trip) => {
      const platformFee = parseFloat(trip.basePrice || 0) * 0.15; // Assuming 15% platform fee
      return sum + platformFee;
    }, 0);
    
    // Revenue by vehicle type
    const revenueByVehicleType = {};
    trips.forEach(trip => {
      const vehicleType = trip.vehicleType || 'standard';
      if (!revenueByVehicleType[vehicleType]) {
        revenueByVehicleType[vehicleType] = 0;
      }
      revenueByVehicleType[vehicleType] += parseFloat(trip.finalPrice || 0);
    });
    
    // Revenue by day
    const revenueByDay = {};
    trips.forEach(trip => {
      const day = trip.createdAt.toISOString().split('T')[0];
      if (!revenueByDay[day]) {
        revenueByDay[day] = 0;
      }
      revenueByDay[day] += parseFloat(trip.finalPrice || 0);
    });
    
    // Sort revenue by day
    const sortedRevenueByDay = Object.entries(revenueByDay)
      .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
      .reduce((obj, [day, revenue]) => {
        obj[day] = revenue;
        return obj;
      }, {});

    return {
      totalTrips,
      avgBasePrice: Math.round(avgBasePrice * 100) / 100,
      avgFinalPrice: Math.round(avgFinalPrice * 100) / 100,
      avgSurgeFactor: Math.round(avgSurgeFactor * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
      revenueByVehicleType: Object.entries(revenueByVehicleType).reduce((obj, [type, amount]) => {
        obj[type] = Math.round(amount * 100) / 100;
        return obj;
      }, {}),
      revenueByDay: Object.entries(sortedRevenueByDay).reduce((obj, [day, amount]) => {
        obj[day] = Math.round(amount * 100) / 100;
        return obj;
      }, {}),
      currency: 'XOF'
    };
  } catch (error) {
    console.error('Pricing statistics error:', error);
    throw error;
  }
};
