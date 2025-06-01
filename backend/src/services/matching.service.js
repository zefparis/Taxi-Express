/**
 * Matching Service for Taxi-Express
 * Handles AI-based driver matching for trip requests
 */

const { Driver, User, Trip } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

/**
 * Find the optimal driver for a trip
 * @param {string} tripId - ID of the trip to match
 * @returns {Promise<Object>} Matching result with driver ID and score
 */
exports.findOptimalDriver = async (tripId) => {
  try {
    // Get trip details
    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      throw new Error(`Trip not found: ${tripId}`);
    }

    // Get client details
    const client = await User.findByPk(trip.clientId);
    if (!client) {
      throw new Error(`Client not found: ${trip.clientId}`);
    }

    // Find available drivers within radius
    const pickupLocation = trip.pickupLocation;
    const radius = 5; // 5 km radius

    // Create a point geometry from the pickup coordinates
    const point = { 
      type: 'Point', 
      coordinates: [
        pickupLocation.coordinates[0], 
        pickupLocation.coordinates[1]
      ] 
    };
    
    // Find available drivers within the specified radius
    const availableDrivers = await Driver.findAll({
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
          as: 'userAccount',
          attributes: ['id', 'firstName', 'lastName', 'rating', 'preferredLanguage']
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

    if (availableDrivers.length === 0) {
      return {
        success: false,
        message: 'No available drivers found in the area'
      };
    }

    // Calculate matching scores for each driver
    const scoredDrivers = await Promise.all(
      availableDrivers.map(async (driver) => {
        const score = await calculateMatchingScore(driver, client, trip);
        return {
          driverId: driver.id,
          userId: driver.user.id,
          distance: parseFloat(driver.getDataValue('distance')),
          rating: driver.user.rating,
          acceptanceRate: driver.acceptanceRate,
          completionRate: driver.completionRate,
          totalTrips: driver.totalTrips,
          score
        };
      })
    );

    // Sort by matching score (descending)
    scoredDrivers.sort((a, b) => b.score - a.score);

    // Select the best driver
    const bestMatch = scoredDrivers[0];

    return {
      success: true,
      driverId: bestMatch.driverId,
      userId: bestMatch.userId,
      distance: bestMatch.distance,
      score: bestMatch.score
    };
  } catch (error) {
    console.error('Driver matching error:', error);
    return {
      success: false,
      message: 'Error finding optimal driver',
      error: error.message
    };
  }
};

/**
 * Calculate matching score between driver and client/trip
 * @param {Object} driver - Driver object
 * @param {Object} client - Client object
 * @param {Object} trip - Trip object
 * @returns {Promise<number>} Matching score (0-100)
 */
async function calculateMatchingScore(driver, client, trip) {
  try {
    // Base score starts at 50
    let score = 50;

    // Distance factor (closer is better) - up to 20 points
    // Convert meters to kilometers
    const distanceKm = driver.getDataValue('distance') / 1000;
    if (distanceKm <= 1) {
      score += 20; // Very close
    } else if (distanceKm <= 2) {
      score += 15;
    } else if (distanceKm <= 3) {
      score += 10;
    } else if (distanceKm <= 4) {
      score += 5;
    }

    // Rating factor - up to 15 points
    const driverRating = parseFloat(driver.user.rating) || 3;
    score += Math.min(15, (driverRating - 3) * 7.5); // 3 stars = 0 points, 5 stars = 15 points

    // Acceptance rate factor - up to 10 points
    const acceptanceRate = parseFloat(driver.acceptanceRate) || 0;
    score += (acceptanceRate / 100) * 10;

    // Completion rate factor - up to 10 points
    const completionRate = parseFloat(driver.completionRate) || 0;
    score += (completionRate / 100) * 10;

    // Experience factor (total trips) - up to 10 points
    const totalTrips = parseInt(driver.totalTrips) || 0;
    if (totalTrips >= 500) {
      score += 10; // Very experienced
    } else if (totalTrips >= 100) {
      score += 7;
    } else if (totalTrips >= 50) {
      score += 5;
    } else if (totalTrips >= 10) {
      score += 3;
    }

    // Language match factor - up to 5 points
    if (driver.user.preferredLanguage && client.preferredLanguage) {
      if (driver.user.preferredLanguage === client.preferredLanguage) {
        score += 5; // Perfect language match
      }
    }

    // Vehicle type preference factor - up to 5 points
    // If client has a vehicle type preference in the trip
    if (trip.vehicleTypePreference && trip.vehicleTypePreference === driver.vehicleType) {
      score += 5; // Perfect vehicle match
    }

    // Previous trips factor - up to 5 points
    // Check if driver and client have had successful trips together
    const previousTrips = await Trip.count({
      where: {
        clientId: client.id,
        driverId: driver.id,
        status: 'completed',
        clientRating: {
          [Op.gte]: 4 // Good rating from client
        }
      }
    });

    if (previousTrips >= 3) {
      score += 5; // Multiple good trips together
    } else if (previousTrips >= 1) {
      score += 3; // At least one good trip together
    }

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error('Error calculating matching score:', error);
    return 50; // Default to neutral score on error
  }
}

/**
 * Get matching statistics for a driver
 * @param {string} driverId - ID of the driver
 * @returns {Promise<Object>} Matching statistics
 */
exports.getDriverMatchingStats = async (driverId) => {
  try {
    // Get driver
    const driver = await Driver.findByPk(driverId, {
      include: [
        {
          model: User,
          as: 'userAccount',
          attributes: ['id', 'firstName', 'lastName', 'rating']
        }
      ]
    });

    if (!driver) {
      throw new Error(`Driver not found: ${driverId}`);
    }

    // Get trips where this driver was matched
    const matchedTrips = await Trip.findAll({
      where: {
        driverId,
        aiMatchScore: {
          [Op.ne]: null
        }
      },
      attributes: ['id', 'status', 'aiMatchScore', 'clientRating', 'driverRating', 'createdAt']
    });

    // Calculate statistics
    const totalMatches = matchedTrips.length;
    const averageMatchScore = totalMatches > 0
      ? matchedTrips.reduce((sum, trip) => sum + parseFloat(trip.aiMatchScore || 0), 0) / totalMatches
      : 0;
    
    const completedMatches = matchedTrips.filter(trip => trip.status === 'completed').length;
    const cancelledMatches = matchedTrips.filter(trip => trip.status === 'canceled').length;
    
    const matchCompletionRate = totalMatches > 0
      ? (completedMatches / totalMatches) * 100
      : 0;

    // Calculate average client rating for completed trips
    const completedTrips = matchedTrips.filter(trip => trip.status === 'completed' && trip.clientRating);
    const averageClientRating = completedTrips.length > 0
      ? completedTrips.reduce((sum, trip) => sum + parseFloat(trip.clientRating || 0), 0) / completedTrips.length
      : 0;

    return {
      driverId,
      driverName: `${driver.user.firstName} ${driver.user.lastName}`,
      driverRating: driver.user.rating,
      totalMatches,
      completedMatches,
      cancelledMatches,
      matchCompletionRate,
      averageMatchScore,
      averageClientRating
    };
  } catch (error) {
    console.error('Driver matching stats error:', error);
    throw error;
  }
};

/**
 * Get matching statistics for a client
 * @param {string} clientId - ID of the client
 * @returns {Promise<Object>} Matching statistics
 */
exports.getClientMatchingStats = async (clientId) => {
  try {
    // Get client
    const client = await User.findByPk(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    // Get trips for this client
    const clientTrips = await Trip.findAll({
      where: {
        clientId,
        aiMatchScore: {
          [Op.ne]: null
        }
      },
      include: [
        {
          model: Driver,
          as: 'tripDriver',
          include: [
            {
              model: User,
              as: 'userAccount',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ],
      attributes: ['id', 'status', 'aiMatchScore', 'clientRating', 'driverRating', 'createdAt']
    });

    // Calculate statistics
    const totalTrips = clientTrips.length;
    const averageMatchScore = totalTrips > 0
      ? clientTrips.reduce((sum, trip) => sum + parseFloat(trip.aiMatchScore || 0), 0) / totalTrips
      : 0;
    
    const completedTrips = clientTrips.filter(trip => trip.status === 'completed').length;
    const cancelledTrips = clientTrips.filter(trip => trip.status === 'canceled').length;
    
    const tripCompletionRate = totalTrips > 0
      ? (completedTrips / totalTrips) * 100
      : 0;

    // Calculate average driver rating for completed trips
    const completedWithRating = clientTrips.filter(trip => trip.status === 'completed' && trip.driverRating);
    const averageDriverRating = completedWithRating.length > 0
      ? completedWithRating.reduce((sum, trip) => sum + parseFloat(trip.driverRating || 0), 0) / completedWithRating.length
      : 0;

    // Find most frequently matched drivers
    const driverCounts = {};
    clientTrips.forEach(trip => {
      if (trip.driver && trip.driver.user) {
        const driverId = trip.driver.id;
        const driverName = `${trip.driver.user.firstName} ${trip.driver.user.lastName}`;
        
        if (!driverCounts[driverId]) {
          driverCounts[driverId] = {
            count: 0,
            name: driverName
          };
        }
        
        driverCounts[driverId].count++;
      }
    });

    const frequentDrivers = Object.entries(driverCounts)
      .map(([driverId, data]) => ({
        driverId,
        driverName: data.name,
        tripCount: data.count
      }))
      .sort((a, b) => b.tripCount - a.tripCount)
      .slice(0, 3); // Top 3 drivers

    return {
      clientId,
      clientName: `${client.firstName} ${client.lastName}`,
      totalTrips,
      completedTrips,
      cancelledTrips,
      tripCompletionRate,
      averageMatchScore,
      averageDriverRating,
      frequentDrivers
    };
  } catch (error) {
    console.error('Client matching stats error:', error);
    throw error;
  }
};
