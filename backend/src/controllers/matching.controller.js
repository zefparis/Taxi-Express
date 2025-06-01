/**
 * Matching Controller for Taxi-Express
 * Handles driver-client matching algorithms and parameters
 */

const { Driver, User, Trip, MatchingParameter, Vehicle } = require('../models');
const { createAdminLog } = require('../services/admin.service');
const { calculateDistance } = require('../utils/geo.utils');
const { Op } = require('sequelize');

/**
 * Find optimal driver for a trip request
 * @route POST /api/matching/find-driver
 */
exports.findOptimalDriver = async (req, res) => {
  try {
    const { 
      pickupLocation, 
      dropoffLocation, 
      vehicleType = 'standard',
      scheduledTime,
      clientId
    } = req.body;
    
    if (!pickupLocation || !pickupLocation.latitude || !pickupLocation.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Valid pickup location is required'
      });
    }

    // Get matching parameters
    const matchingParams = await MatchingParameter.findOne({
      order: [['updatedAt', 'DESC']]
    }) || {
      maxDriverDistance: 5, // km
      maxWaitTime: 10, // minutes
      driverRatingWeight: 0.3,
      distanceWeight: 0.5,
      acceptanceRateWeight: 0.2
    };

    // Find available drivers
    const availableDrivers = await Driver.findAll({
      where: {
        isAvailable: true,
        isOnline: true,
        vehicleType
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'phone', 'rating', 'totalRatings']
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'make', 'model', 'year', 'color', 'licensePlate']
        }
      ]
    });

    if (availableDrivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No available drivers found for your request'
      });
    }

    // Calculate scores for each driver
    const driversWithScores = availableDrivers.map(driver => {
      // Calculate distance from driver to pickup
      const driverLocation = {
        latitude: driver.currentLatitude,
        longitude: driver.currentLongitude
      };
      
      const distanceToPickup = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        pickupLocation.latitude,
        pickupLocation.longitude
      );
      
      // Skip drivers who are too far away
      if (distanceToPickup > matchingParams.maxDriverDistance) {
        return null;
      }
      
      // Calculate estimated arrival time (simplified)
      const estimatedArrivalMinutes = Math.round(distanceToPickup * 2); // Assuming 30km/h average speed
      
      // Skip if arrival time exceeds max wait time
      if (estimatedArrivalMinutes > matchingParams.maxWaitTime) {
        return null;
      }
      
      // Calculate driver score
      const distanceScore = 1 - (distanceToPickup / matchingParams.maxDriverDistance);
      const ratingScore = driver.user.rating / 5;
      const acceptanceRateScore = driver.acceptanceRate / 100;
      
      const totalScore = (
        (distanceScore * matchingParams.distanceWeight) +
        (ratingScore * matchingParams.driverRatingWeight) +
        (acceptanceRateScore * matchingParams.acceptanceRateWeight)
      );
      
      return {
        driver,
        distanceToPickup,
        estimatedArrivalMinutes,
        score: totalScore
      };
    }).filter(item => item !== null);

    if (driversWithScores.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No drivers available within the acceptable distance and time'
      });
    }

    // Sort by score (highest first)
    driversWithScores.sort((a, b) => b.score - a.score);
    
    // Get the top 3 drivers
    const topDrivers = driversWithScores.slice(0, 3);
    
    // Format response
    const matchingResults = topDrivers.map(item => ({
      driverId: item.driver.id,
      driverName: `${item.driver.user.firstName} ${item.driver.user.lastName}`,
      driverPhone: item.driver.user.phone,
      driverRating: item.driver.user.rating,
      distanceToPickup: item.distanceToPickup,
      estimatedArrivalMinutes: item.estimatedArrivalMinutes,
      vehicle: {
        make: item.driver.vehicle.make,
        model: item.driver.vehicle.model,
        color: item.driver.vehicle.color,
        licensePlate: item.driver.vehicle.licensePlate
      },
      matchScore: Math.round(item.score * 100) / 100
    }));

    res.status(200).json({
      success: true,
      data: {
        matchingResults,
        optimalDriver: matchingResults[0],
        totalDriversConsidered: availableDrivers.length,
        matchingParameters: {
          maxDriverDistance: matchingParams.maxDriverDistance,
          maxWaitTime: matchingParams.maxWaitTime
        }
      }
    });
  } catch (error) {
    console.error('Find optimal driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding optimal driver',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get driver matching statistics
 * @route GET /api/matching/drivers/:driverId/stats
 */
exports.getDriverMatchingStats = async (req, res) => {
  try {
    const { driverId } = req.params;
    
    // Verify driver exists
    const driver = await Driver.findByPk(driverId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Verify access permissions
    if (req.user.role !== 'admin' && req.user.id !== driver.userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view these statistics'
      });
    }

    // Get trips where this driver was matched
    const trips = await Trip.findAll({
      where: { driverId },
      attributes: ['id', 'status', 'createdAt', 'matchingScore', 'driverResponseTime']
    });

    // Calculate statistics
    const totalTrips = trips.length;
    const completedTrips = trips.filter(trip => trip.status === 'completed').length;
    const cancelledTrips = trips.filter(trip => trip.status === 'cancelled').length;
    
    const averageMatchingScore = trips.reduce((sum, trip) => sum + (trip.matchingScore || 0), 0) / (totalTrips || 1);
    
    const responseTimesWithData = trips.filter(trip => trip.driverResponseTime !== null);
    const averageResponseTime = responseTimesWithData.reduce((sum, trip) => sum + trip.driverResponseTime, 0) / 
                              (responseTimesWithData.length || 1);

    res.status(200).json({
      success: true,
      data: {
        driverId,
        driverName: `${driver.user.firstName} ${driver.user.lastName}`,
        statistics: {
          totalTrips,
          completedTrips,
          cancelledTrips,
          completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
          averageMatchingScore,
          averageResponseTime
        }
      }
    });
  } catch (error) {
    console.error('Get driver matching stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver matching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get client matching statistics
 * @route GET /api/matching/clients/:clientId/stats
 */
exports.getClientMatchingStats = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Verify client exists
    const client = await User.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Verify access permissions
    if (req.user.role !== 'admin' && req.user.id !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view these statistics'
      });
    }

    // Get trips for this client
    const trips = await Trip.findAll({
      where: { clientId },
      attributes: ['id', 'status', 'createdAt', 'matchingScore', 'driverId']
    });

    // Calculate statistics
    const totalTrips = trips.length;
    const completedTrips = trips.filter(trip => trip.status === 'completed').length;
    const cancelledTrips = trips.filter(trip => trip.status === 'cancelled').length;
    
    const averageMatchingScore = trips.reduce((sum, trip) => sum + (trip.matchingScore || 0), 0) / (totalTrips || 1);
    
    // Count unique drivers
    const uniqueDrivers = new Set(trips.map(trip => trip.driverId)).size;

    res.status(200).json({
      success: true,
      data: {
        clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        statistics: {
          totalTrips,
          completedTrips,
          cancelledTrips,
          completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
          averageMatchingScore,
          uniqueDriversMatched: uniqueDrivers
        }
      }
    });
  } catch (error) {
    console.error('Get client matching stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client matching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get trip matching score
 * @route GET /api/matching/trips/:tripId/score
 */
exports.getTripMatchingScore = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    // Find trip
    const trip = await Trip.findByPk(tripId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Driver,
          as: 'driver',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ]
    });
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Verify access permissions
    if (req.user.role !== 'admin' && req.user.id !== trip.clientId && req.user.id !== trip.driver?.userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this information'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        tripId: trip.id,
        client: {
          id: trip.client.id,
          name: `${trip.client.firstName} ${trip.client.lastName}`
        },
        driver: trip.driver ? {
          id: trip.driver.id,
          name: `${trip.driver.user.firstName} ${trip.driver.user.lastName}`
        } : null,
        matchingScore: trip.matchingScore || 0,
        matchingDetails: trip.matchingDetails || {},
        driverResponseTime: trip.driverResponseTime
      }
    });
  } catch (error) {
    console.error('Get trip matching score error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip matching score',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get matching statistics
 * @route GET /api/matching/statistics
 */
exports.getMatchingStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Define date range
    const dateRange = {};
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get all trips within date range
    const trips = await Trip.findAll({
      where: dateRange,
      attributes: ['id', 'status', 'matchingScore', 'driverResponseTime', 'createdAt']
    });

    // Calculate statistics
    const totalTrips = trips.length;
    const completedTrips = trips.filter(trip => trip.status === 'completed').length;
    const cancelledTrips = trips.filter(trip => trip.status === 'cancelled').length;
    const noDriverFoundTrips = trips.filter(trip => trip.status === 'no_driver_found').length;
    
    // Calculate average matching score
    const tripsWithMatchingScore = trips.filter(trip => trip.matchingScore !== null);
    const averageMatchingScore = tripsWithMatchingScore.reduce((sum, trip) => sum + trip.matchingScore, 0) / 
                               (tripsWithMatchingScore.length || 1);
    
    // Calculate average response time
    const tripsWithResponseTime = trips.filter(trip => trip.driverResponseTime !== null);
    const averageResponseTime = tripsWithResponseTime.reduce((sum, trip) => sum + trip.driverResponseTime, 0) / 
                              (tripsWithResponseTime.length || 1);

    res.status(200).json({
      success: true,
      data: {
        period: startDate && endDate ? { startDate, endDate } : 'all time',
        overview: {
          totalTrips,
          completedTrips,
          cancelledTrips,
          noDriverFoundTrips,
          completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
          cancellationRate: totalTrips > 0 ? (cancelledTrips / totalTrips) * 100 : 0,
          noDriverRate: totalTrips > 0 ? (noDriverFoundTrips / totalTrips) * 100 : 0
        },
        matching: {
          averageMatchingScore,
          averageResponseTime
        }
      }
    });
  } catch (error) {
    console.error('Get matching statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update matching parameters
 * @route PUT /api/matching/parameters
 */
exports.updateMatchingParameters = async (req, res) => {
  try {
    const { 
      maxDriverDistance, 
      maxWaitTime, 
      driverRatingWeight, 
      distanceWeight, 
      acceptanceRateWeight 
    } = req.body;
    
    // Validate weights sum to 1
    if (driverRatingWeight && distanceWeight && acceptanceRateWeight) {
      const sum = driverRatingWeight + distanceWeight + acceptanceRateWeight;
      if (Math.abs(sum - 1) > 0.01) { // Allow small floating point error
        return res.status(400).json({
          success: false,
          message: 'Weights must sum to 1'
        });
      }
    }

    // Create new parameters
    const parameters = await MatchingParameter.create({
      maxDriverDistance: maxDriverDistance || 5,
      maxWaitTime: maxWaitTime || 10,
      driverRatingWeight: driverRatingWeight || 0.3,
      distanceWeight: distanceWeight || 0.5,
      acceptanceRateWeight: acceptanceRateWeight || 0.2,
      updatedBy: req.user.id
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'matching_parameters_updated',
      targetType: 'matching_parameters',
      targetId: parameters.id,
      details: `Updated matching parameters`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Matching parameters updated successfully',
      data: parameters
    });
  } catch (error) {
    console.error('Update matching parameters error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating matching parameters',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get matching parameters
 * @route GET /api/matching/parameters
 */
exports.getMatchingParameters = async (req, res) => {
  try {
    // Get latest parameters
    const parameters = await MatchingParameter.findOne({
      order: [['updatedAt', 'DESC']]
    });

    if (!parameters) {
      return res.status(200).json({
        success: true,
        data: {
          maxDriverDistance: 5, // km
          maxWaitTime: 10, // minutes
          driverRatingWeight: 0.3,
          distanceWeight: 0.5,
          acceptanceRateWeight: 0.2,
          note: 'Using default parameters as none have been set'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: parameters
    });
  } catch (error) {
    console.error('Get matching parameters error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matching parameters',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Simulate matching
 * @route POST /api/matching/simulate
 */
exports.simulateMatching = async (req, res) => {
  try {
    const { 
      pickupLocation, 
      dropoffLocation, 
      vehicleType = 'standard',
      maxDriverDistance,
      driverRatingWeight,
      distanceWeight,
      acceptanceRateWeight
    } = req.body;
    
    if (!pickupLocation || !pickupLocation.latitude || !pickupLocation.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Valid pickup location is required'
      });
    }

    // Use provided parameters or get from database
    let matchingParams;
    if (maxDriverDistance || driverRatingWeight || distanceWeight || acceptanceRateWeight) {
      matchingParams = {
        maxDriverDistance: maxDriverDistance || 5,
        maxWaitTime: 10, // default
        driverRatingWeight: driverRatingWeight || 0.3,
        distanceWeight: distanceWeight || 0.5,
        acceptanceRateWeight: acceptanceRateWeight || 0.2
      };
    } else {
      matchingParams = await MatchingParameter.findOne({
        order: [['updatedAt', 'DESC']]
      }) || {
        maxDriverDistance: 5,
        maxWaitTime: 10,
        driverRatingWeight: 0.3,
        distanceWeight: 0.5,
        acceptanceRateWeight: 0.2
      };
    }

    // Find all drivers (for simulation, include offline/unavailable)
    const allDrivers = await Driver.findAll({
      where: {
        vehicleType
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'rating', 'totalRatings']
        }
      ]
    });

    if (allDrivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No drivers found for simulation'
      });
    }

    // Calculate scores for each driver
    const driversWithScores = allDrivers.map(driver => {
      // Calculate distance from driver to pickup
      const driverLocation = {
        latitude: driver.currentLatitude,
        longitude: driver.currentLongitude
      };
      
      const distanceToPickup = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        pickupLocation.latitude,
        pickupLocation.longitude
      );
      
      // Skip drivers who are too far away
      if (distanceToPickup > matchingParams.maxDriverDistance) {
        return null;
      }
      
      // Calculate driver score
      const distanceScore = 1 - (distanceToPickup / matchingParams.maxDriverDistance);
      const ratingScore = driver.user.rating / 5;
      const acceptanceRateScore = driver.acceptanceRate / 100;
      
      const totalScore = (
        (distanceScore * matchingParams.distanceWeight) +
        (ratingScore * matchingParams.driverRatingWeight) +
        (acceptanceRateScore * matchingParams.acceptanceRateWeight)
      );
      
      return {
        driver,
        distanceToPickup,
        distanceScore,
        ratingScore,
        acceptanceRateScore,
        totalScore
      };
    }).filter(item => item !== null);

    if (driversWithScores.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No drivers available within the acceptable distance'
      });
    }

    // Sort by score (highest first)
    driversWithScores.sort((a, b) => b.totalScore - a.totalScore);
    
    // Format response
    const simulationResults = driversWithScores.map(item => ({
      driverId: item.driver.id,
      driverName: `${item.driver.user.firstName} ${item.driver.user.lastName}`,
      driverRating: item.driver.user.rating,
      distanceToPickup: item.distanceToPickup,
      isAvailable: item.driver.isAvailable,
      isOnline: item.driver.isOnline,
      scoreComponents: {
        distanceScore: item.distanceScore,
        ratingScore: item.ratingScore,
        acceptanceRateScore: item.acceptanceRateScore
      },
      totalScore: Math.round(item.totalScore * 100) / 100
    }));

    res.status(200).json({
      success: true,
      data: {
        simulationParameters: matchingParams,
        totalDriversConsidered: allDrivers.length,
        driversWithinRange: driversWithScores.length,
        simulationResults: simulationResults.slice(0, 10) // Return top 10
      }
    });
  } catch (error) {
    console.error('Simulate matching error:', error);
    res.status(500).json({
      success: false,
      message: 'Error simulating matching',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get matching performance
 * @route GET /api/matching/performance
 */
exports.getMatchingPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Define date range
    const dateRange = {};
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get all trips within date range
    const trips = await Trip.findAll({
      where: dateRange,
      attributes: ['id', 'status', 'matchingScore', 'driverResponseTime', 'createdAt', 'clientId', 'driverId']
    });

    // Calculate performance metrics
    const totalRequests = trips.length;
    const successfulMatches = trips.filter(trip => trip.driverId !== null).length;
    const matchRate = totalRequests > 0 ? (successfulMatches / totalRequests) * 100 : 0;
    
    // Calculate average response time
    const tripsWithResponseTime = trips.filter(trip => trip.driverResponseTime !== null);
    const averageResponseTime = tripsWithResponseTime.reduce((sum, trip) => sum + trip.driverResponseTime, 0) / 
                              (tripsWithResponseTime.length || 1);
    
    // Calculate average matching score
    const tripsWithMatchingScore = trips.filter(trip => trip.matchingScore !== null);
    const averageMatchingScore = tripsWithMatchingScore.reduce((sum, trip) => sum + trip.matchingScore, 0) / 
                               (tripsWithMatchingScore.length || 1);

    // Calculate unique clients and drivers
    const uniqueClients = new Set(trips.map(trip => trip.clientId)).size;
    const uniqueDrivers = new Set(trips.filter(trip => trip.driverId !== null).map(trip => trip.driverId)).size;

    res.status(200).json({
      success: true,
      data: {
        period: startDate && endDate ? { startDate, endDate } : 'all time',
        performance: {
          totalRequests,
          successfulMatches,
          failedMatches: totalRequests - successfulMatches,
          matchRate,
          averageResponseTime,
          averageMatchingScore
        },
        usage: {
          uniqueClients,
          uniqueDrivers,
          requestsPerClient: uniqueClients > 0 ? totalRequests / uniqueClients : 0,
          tripsPerDriver: uniqueDrivers > 0 ? successfulMatches / uniqueDrivers : 0
        }
      }
    });
  } catch (error) {
    console.error('Get matching performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matching performance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
