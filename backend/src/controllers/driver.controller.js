/**
 * Driver Controller for Taxi-Express
 * Handles driver-specific operations
 */

const { Driver, User, Trip, Payment, Notification } = require('../models');
const { createAdminLog } = require('../services/admin.service');
const { checkFraudRisk } = require('../services/fraud.service');
const { sendSMS } = require('../services/sms.service');
const { Op } = require('sequelize');

/**
 * Get all available drivers
 * @route GET /api/drivers/available
 */
exports.getAvailableDrivers = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query; // radius in km
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Create a point geometry from the provided coordinates
    const point = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
    
    // Find available drivers within the specified radius
    const drivers = await Driver.findAll({
      where: {
        isAvailable: true,
        isVerified: true,
        currentLocation: {
          [Op.ne]: null
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'rating']
        }
      ],
      attributes: {
        include: [
          [
            sequelize.fn(
              'ST_DistanceSphere',
              sequelize.col('currentLocation'),
              sequelize.fn('ST_SetSRID', sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(point)), 4326)
            ),
            'distance'
          ]
        ]
      },
      having: sequelize.literal(`distance <= ${radius * 1000}`), // Convert km to meters
      order: [[sequelize.literal('distance'), 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: drivers.map(driver => ({
        id: driver.id,
        userId: driver.userId,
        firstName: driver.user.firstName,
        lastName: driver.user.lastName,
        rating: driver.user.rating,
        vehicleType: driver.vehicleType,
        vehicleMake: driver.vehicleMake,
        vehicleModel: driver.vehicleModel,
        distance: parseFloat(driver.getDataValue('distance')) / 1000, // Convert meters to km
        location: driver.currentLocation
      }))
    });
  } catch (error) {
    console.error('Get available drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available drivers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update driver location
 * @route PATCH /api/drivers/:id/location
 */
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;
    
    // Validate request
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Check if user is the driver or admin
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (req.user.role !== 'admin' && driver.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this driver location'
      });
    }

    // Create a point geometry from the provided coordinates
    const point = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
    
    // Update driver location
    driver.currentLocation = point;
    driver.lastLocationUpdate = new Date();
    await driver.save();

    // Check for potential GPS spoofing
    if (req.user.role !== 'admin') {
      const activeTrip = await Trip.findOne({
        where: {
          driverId: id,
          status: {
            [Op.in]: ['assigned', 'active']
          }
        }
      });

      if (activeTrip) {
        // If there's an active trip, update its current location too
        activeTrip.currentLocation = point;
        await activeTrip.save();

        // Check for suspicious location changes (potential GPS spoofing)
        await checkFraudRisk(driver.userId, 'suspicious_location', {
          tripId: activeTrip.id,
          newLocation: point,
          timestamp: new Date()
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        id: driver.id,
        currentLocation: driver.currentLocation,
        lastLocationUpdate: driver.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating driver location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update driver availability status
 * @route PATCH /api/drivers/:id/availability
 */
exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;
    
    // Validate request
    if (isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Availability status is required'
      });
    }

    // Check if user is the driver or admin
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (req.user.role !== 'admin' && driver.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this driver availability'
      });
    }

    // Check if driver is verified
    if (!driver.isVerified && isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Driver must be verified before becoming available'
      });
    }

    // Check for active trips before going offline
    if (!isAvailable) {
      const activeTrip = await Trip.findOne({
        where: {
          driverId: id,
          status: {
            [Op.in]: ['assigned', 'active']
          }
        }
      });

      if (activeTrip) {
        return res.status(400).json({
          success: false,
          message: 'Cannot go offline while having an active trip'
        });
      }
    }

    // Update driver availability
    driver.isAvailable = isAvailable;
    await driver.save();

    res.status(200).json({
      success: true,
      message: `Driver is now ${isAvailable ? 'available' : 'unavailable'}`,
      data: {
        id: driver.id,
        isAvailable: driver.isAvailable
      }
    });
  } catch (error) {
    console.error('Update driver availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating driver availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get driver details
 * @route GET /api/drivers/:id
 */
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const driver = await Driver.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'rating', 'walletBalance']
        }
      ]
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // If not admin and not the driver, return limited info
    if (req.user.role !== 'admin' && driver.userId !== req.user.id) {
      return res.status(200).json({
        success: true,
        data: {
          id: driver.id,
          firstName: driver.user.firstName,
          lastName: driver.user.lastName,
          rating: driver.user.rating,
          vehicleType: driver.vehicleType,
          vehicleMake: driver.vehicleMake,
          vehicleModel: driver.vehicleModel,
          vehicleYear: driver.vehicleYear,
          licensePlate: driver.licensePlate,
          totalTrips: driver.totalTrips
        }
      });
    }

    // Return full info for admin or the driver
    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update driver verification status (admin only)
 * @route PATCH /api/drivers/:id/verification
 */
exports.updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus, rejectionReason } = req.body;
    
    // Validate request
    if (!verificationStatus || !['approved', 'rejected', 'pending'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Valid verification status is required (approved, rejected, pending)'
      });
    }

    // Only admin can update verification status
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update driver verification status'
      });
    }

    const driver = await Driver.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'preferredLanguage']
        }
      ]
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Store previous data for admin log
    const previousData = {
      verificationStatus: driver.verificationStatus,
      isVerified: driver.isVerified
    };

    // Update driver verification status
    driver.verificationStatus = verificationStatus;
    driver.isVerified = verificationStatus === 'approved';
    
    if (verificationStatus === 'rejected') {
      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting a driver'
        });
      }
      driver.rejectionReason = rejectionReason;
      driver.isAvailable = false;
    } else {
      driver.rejectionReason = null;
    }

    await driver.save();

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: verificationStatus === 'approved' ? 'driver_verify' : 'driver_reject',
      targetType: 'driver',
      targetId: driver.id,
      details: `Admin ${verificationStatus === 'approved' ? 'approved' : 'rejected'} driver verification. ${verificationStatus === 'rejected' ? `Reason: ${rejectionReason}` : ''}`,
      previousData,
      newData: {
        verificationStatus: driver.verificationStatus,
        isVerified: driver.isVerified,
        rejectionReason: driver.rejectionReason
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Create notification for driver
    await Notification.create({
      userId: driver.userId,
      type: 'account_update',
      title: `Driver Verification ${verificationStatus === 'approved' ? 'Approved' : 'Rejected'}`,
      message: verificationStatus === 'approved' 
        ? 'Your driver account has been verified. You can now go online and start accepting trips.' 
        : `Your driver verification was rejected. Reason: ${rejectionReason}`,
      channel: 'app',
      priority: 'high'
    });

    // Send SMS notification
    await sendSMS(
      driver.user.phoneNumber,
      verificationStatus === 'approved' 
        ? 'Votre compte chauffeur Taxi-Express a été vérifié. Vous pouvez maintenant vous connecter et commencer à accepter des courses.' 
        : `Votre vérification de chauffeur a été rejetée. Raison: ${rejectionReason}`,
      driver.user.preferredLanguage || 'fr'
    );

    res.status(200).json({
      success: true,
      message: `Driver verification status updated to ${verificationStatus}`,
      data: {
        id: driver.id,
        verificationStatus: driver.verificationStatus,
        isVerified: driver.isVerified,
        rejectionReason: driver.rejectionReason
      }
    });
  } catch (error) {
    console.error('Update driver verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating driver verification status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get driver trip history
 * @route GET /api/drivers/:id/trips
 */
exports.getDriverTrips = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Check if user is the driver or admin
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (req.user.role !== 'admin' && driver.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this data'
      });
    }

    // Build query conditions
    const where = { driverId: id };
    if (status) {
      where.status = status;
    }

    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get trips with pagination
    const { count, rows: trips } = await Trip.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'rating']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        trips,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get driver trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver trips',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get driver earnings
 * @route GET /api/drivers/:id/earnings
 */
exports.getDriverEarnings = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'week' } = req.query; // day, week, month, year
    
    // Check if user is the driver or admin
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (req.user.role !== 'admin' && driver.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this data'
      });
    }

    // Calculate date range based on period
    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
    }

    // Get payments for the period
    const payments = await Payment.findAll({
      where: {
        driverId: id,
        status: 'completed',
        createdAt: {
          [Op.gte]: startDate
        }
      },
      include: [
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'pickupAddress', 'destinationAddress', 'status', 'startTime', 'endTime', 'actualDistance']
        }
      ]
    });

    // Calculate total earnings and stats
    const totalEarnings = payments.reduce((sum, payment) => sum + parseFloat(payment.driverAmount), 0);
    const totalTrips = payments.length;
    const totalDistance = payments.reduce((sum, payment) => {
      return sum + (payment.trip.actualDistance || 0);
    }, 0);

    // Group earnings by day
    const earningsByDay = {};
    payments.forEach(payment => {
      const date = payment.createdAt.toISOString().split('T')[0];
      if (!earningsByDay[date]) {
        earningsByDay[date] = 0;
      }
      earningsByDay[date] += parseFloat(payment.driverAmount);
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        totalEarnings,
        totalTrips,
        totalDistance,
        earningsByDay,
        payments
      }
    });
  } catch (error) {
    console.error('Get driver earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver earnings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update driver vehicle information
 * @route PATCH /api/drivers/:id/vehicle
 */
exports.updateVehicleInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      vehicleType, vehicleMake, vehicleModel, vehicleYear,
      licensePlate, licenseNumber, licenseExpiry, 
      insuranceNumber, insuranceExpiry 
    } = req.body;
    
    // Check if user is the driver or admin
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (req.user.role !== 'admin' && driver.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this driver information'
      });
    }

    // Store previous data for admin log
    const previousData = { ...driver.toJSON() };

    // Update vehicle information
    if (vehicleType) driver.vehicleType = vehicleType;
    if (vehicleMake) driver.vehicleMake = vehicleMake;
    if (vehicleModel) driver.vehicleModel = vehicleModel;
    if (vehicleYear) driver.vehicleYear = vehicleYear;
    if (licensePlate) driver.licensePlate = licensePlate;
    if (licenseNumber) driver.licenseNumber = licenseNumber;
    if (licenseExpiry) driver.licenseExpiry = licenseExpiry;
    if (insuranceNumber) driver.insuranceNumber = insuranceNumber;
    if (insuranceExpiry) driver.insuranceExpiry = insuranceExpiry;

    // If driver updates vehicle info, set verification status back to pending
    if (req.user.role !== 'admin') {
      driver.verificationStatus = 'pending';
      driver.isVerified = false;
      driver.isAvailable = false;
    }

    await driver.save();

    // Create admin log if admin is making the update
    if (req.user.role === 'admin') {
      await createAdminLog({
        adminId: req.user.id,
        action: 'user_update',
        targetType: 'driver',
        targetId: driver.id,
        details: 'Admin updated driver vehicle information',
        previousData,
        newData: driver.toJSON(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } else {
      // Create notification for admins about pending verification
      const admins = await User.findAll({
        where: { role: 'admin', isActive: true }
      });

      for (const admin of admins) {
        await Notification.create({
          userId: admin.id,
          type: 'system_alert',
          title: 'Driver Verification Needed',
          message: `Driver ${driver.id} has updated vehicle information and needs re-verification.`,
          channel: 'app',
          priority: 'medium'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle information updated successfully',
      data: {
        id: driver.id,
        vehicleType: driver.vehicleType,
        vehicleMake: driver.vehicleMake,
        vehicleModel: driver.vehicleModel,
        vehicleYear: driver.vehicleYear,
        licensePlate: driver.licensePlate,
        verificationStatus: driver.verificationStatus,
        isVerified: driver.isVerified
      }
    });
  } catch (error) {
    console.error('Update vehicle info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vehicle information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
