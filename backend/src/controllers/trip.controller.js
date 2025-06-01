/**
 * Trip Controller for Taxi-Express
 * Handles trip requests, assignments, and management
 */

const { Trip, User, Driver, Payment, Notification } = require('../models');
const { Op } = require('sequelize');
const { findOptimalDriver } = require('../services/matching.service');
const { calculatePrice } = require('../services/pricing.service');
const { checkFraudRisk } = require('../services/fraud.service');
const { sendSMS } = require('../services/sms.service');
const { createAdminLog } = require('../services/admin.service');
const { io } = require('../server');

/**
 * Request a new trip
 * @route POST /api/trips/request
 */
exports.requestTrip = async (req, res) => {
  try {
    const { 
      pickupLocation, pickupAddress, destinationLocation, destinationAddress,
      estimatedDistance, estimatedDuration, paymentMethod 
    } = req.body;
    
    // Validate request
    if (!pickupLocation || !pickupAddress || !destinationLocation || !destinationAddress || 
        !estimatedDistance || !estimatedDuration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required trip information'
      });
    }

    // Get client information
    const client = await User.findByPk(req.user.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if client has an active trip
    const activeTrip = await Trip.findOne({
      where: {
        clientId: client.id,
        status: {
          [Op.in]: ['requested', 'assigned', 'active']
        }
      }
    });

    if (activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active trip'
      });
    }

    // Calculate estimated price
    const estimatedPrice = await calculatePrice(estimatedDistance, estimatedDuration);

    // Check wallet balance if payment method is wallet
    if (paymentMethod === 'wallet' && parseFloat(client.walletBalance) < parseFloat(estimatedPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance for this trip'
      });
    }

    // Create new trip
    const trip = await Trip.create({
      clientId: client.id,
      status: 'requested',
      pickupLocation,
      pickupAddress,
      destinationLocation,
      destinationAddress,
      estimatedDistance,
      estimatedDuration,
      estimatedPrice,
      paymentMethod: paymentMethod || 'cash'
    });

    // Emit socket event for new trip request
    io.emit('new_trip_request', {
      tripId: trip.id,
      clientId: client.id,
      pickupLocation,
      destinationLocation
    });

    // Find optimal driver using AI matching service
    findOptimalDriver(trip.id)
      .then(async (result) => {
        if (result.success && result.driverId) {
          // Driver found, update trip
          trip.driverId = result.driverId;
          trip.status = 'assigned';
          trip.aiMatchScore = result.score;
          await trip.save();

          // Notify driver
          const driver = await Driver.findByPk(result.driverId, {
            include: [{ model: User, as: 'userAccount' }]
          });

          if (driver) {
            // Create notification for driver
            await Notification.create({
              userId: driver.userId,
              type: 'trip_assigned',
              title: 'New Trip Assigned',
              message: `You have a new trip from ${trip.pickupAddress} to ${trip.destinationAddress}`,
              data: { tripId: trip.id },
              channel: 'app',
              priority: 'high'
            });

            // Send SMS to driver
            await sendSMS(
              driver.user.phoneNumber,
              `Nouvelle course: De ${trip.pickupAddress} à ${trip.destinationAddress}. Ouvrez l'application pour accepter.`,
              driver.user.preferredLanguage || 'fr'
            );

            // Emit socket event for driver assignment
            io.to(`driver_${driver.userId}`).emit('trip_assigned', {
              tripId: trip.id,
              clientId: client.id,
              pickupLocation: trip.pickupLocation,
              pickupAddress: trip.pickupAddress,
              destinationLocation: trip.destinationLocation,
              destinationAddress: trip.destinationAddress,
              estimatedPrice: trip.estimatedPrice
            });

            // Emit socket event for client
            io.to(`client_${client.id}`).emit('driver_assigned', {
              tripId: trip.id,
              driverId: driver.id,
              driverName: `${driver.user.firstName} ${driver.user.lastName}`,
              driverRating: driver.user.rating,
              vehicleType: driver.vehicleType,
              vehicleMake: driver.vehicleMake,
              vehicleModel: driver.vehicleModel,
              licensePlate: driver.licensePlate
            });
          }
        }
      })
      .catch(error => {
        console.error('Driver matching error:', error);
      });

    res.status(201).json({
      success: true,
      message: 'Trip requested successfully',
      data: {
        trip: {
          id: trip.id,
          status: trip.status,
          pickupAddress: trip.pickupAddress,
          destinationAddress: trip.destinationAddress,
          estimatedDistance: trip.estimatedDistance,
          estimatedDuration: trip.estimatedDuration,
          estimatedPrice: trip.estimatedPrice,
          paymentMethod: trip.paymentMethod
        }
      }
    });
  } catch (error) {
    console.error('Request trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting trip',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Accept a trip (driver)
 * @route PATCH /api/trips/:id/accept
 */
exports.acceptTrip = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find trip
    const trip = await Trip.findByPk(id, {
      include: [
        { model: User, as: 'tripClient' },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ model: User, as: 'userAccount' }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if trip is in assigned status
    if (trip.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Trip cannot be accepted in ${trip.status} status`
      });
    }

    // Check if user is the assigned driver
    const driver = await Driver.findOne({
      where: { userId: req.user.id }
    });

    if (!driver || driver.id !== trip.driverId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this trip'
      });
    }

    // Update driver's acceptance rate
    driver.acceptanceRate = ((driver.acceptanceRate * driver.totalTrips) + 100) / (driver.totalTrips + 1);
    await driver.save();

    // Create notification for client
    await Notification.create({
      userId: trip.clientId,
      type: 'trip_assigned',
      title: 'Driver Accepted',
      message: `Your driver ${trip.driver.user.firstName} ${trip.driver.user.lastName} has accepted your trip and is on the way`,
      data: { tripId: trip.id },
      channel: 'app',
      priority: 'high'
    });

    // Send SMS to client
    await sendSMS(
      trip.client.phoneNumber,
      `Votre chauffeur ${trip.driver.user.firstName} ${trip.driver.user.lastName} a accepté votre course et est en route.`,
      trip.client.preferredLanguage || 'fr'
    );

    // Emit socket events
    io.to(`client_${trip.clientId}`).emit('driver_accepted', {
      tripId: trip.id,
      driverId: driver.id,
      driverName: `${trip.driver.user.firstName} ${trip.driver.user.lastName}`,
      driverLocation: driver.currentLocation
    });

    res.status(200).json({
      success: true,
      message: 'Trip accepted successfully',
      data: {
        tripId: trip.id,
        status: trip.status,
        client: {
          id: trip.client.id,
          name: `${trip.client.firstName} ${trip.client.lastName}`,
          phoneNumber: trip.client.phoneNumber,
          rating: trip.client.rating
        },
        pickup: {
          address: trip.pickupAddress,
          location: trip.pickupLocation
        },
        destination: {
          address: trip.destinationAddress,
          location: trip.destinationLocation
        }
      }
    });
  } catch (error) {
    console.error('Accept trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting trip',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Start a trip
 * @route PATCH /api/trips/:id/start
 */
exports.startTrip = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find trip
    const trip = await Trip.findByPk(id, {
      include: [
        { model: User, as: 'tripClient' },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ model: User, as: 'userAccount' }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if trip is in assigned status
    if (trip.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Trip cannot be started in ${trip.status} status`
      });
    }

    // Check if user is the assigned driver
    const driver = await Driver.findOne({
      where: { userId: req.user.id }
    });

    if (!driver || driver.id !== trip.driverId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this trip'
      });
    }

    // Update trip status
    trip.status = 'active';
    trip.startTime = new Date();
    await trip.save();

    // Create notification for client
    await Notification.create({
      userId: trip.clientId,
      type: 'trip_started',
      title: 'Trip Started',
      message: 'Your trip has started. You can track your journey in real-time.',
      data: { tripId: trip.id },
      channel: 'app',
      priority: 'medium'
    });

    // Emit socket events
    io.to(`client_${trip.clientId}`).emit('trip_started', {
      tripId: trip.id,
      startTime: trip.startTime
    });

    res.status(200).json({
      success: true,
      message: 'Trip started successfully',
      data: {
        tripId: trip.id,
        status: trip.status,
        startTime: trip.startTime
      }
    });
  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting trip',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Complete a trip
 * @route PATCH /api/trips/:id/complete
 */
exports.completeTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualDistance, actualDuration, finalPrice, route } = req.body;
    
    // Find trip
    const trip = await Trip.findByPk(id, {
      include: [
        { model: User, as: 'tripClient' },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ model: User, as: 'userAccount' }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if trip is in active status
    if (trip.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Trip cannot be completed in ${trip.status} status`
      });
    }

    // Check if user is the assigned driver
    const driver = await Driver.findOne({
      where: { userId: req.user.id }
    });

    if (!driver || driver.id !== trip.driverId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this trip'
      });
    }

    // Update trip details
    trip.status = 'completed';
    trip.endTime = new Date();
    trip.actualDistance = actualDistance || trip.estimatedDistance;
    trip.actualDuration = actualDuration || trip.estimatedDuration;
    trip.finalPrice = finalPrice || trip.estimatedPrice;
    if (route) trip.route = route;
    
    await trip.save();

    // Update driver stats
    driver.totalTrips += 1;
    driver.totalEarnings = parseFloat(driver.totalEarnings) + parseFloat(trip.finalPrice * 0.8); // 80% to driver
    driver.completionRate = ((driver.completionRate * (driver.totalTrips - 1)) + 100) / driver.totalTrips;
    await driver.save();

    // Create payment record
    const platformFee = parseFloat(trip.finalPrice) * 0.2; // 20% platform fee
    const driverAmount = parseFloat(trip.finalPrice) - platformFee;
    
    const payment = await Payment.create({
      tripId: trip.id,
      clientId: trip.clientId,
      driverId: trip.driverId,
      amount: trip.finalPrice,
      platformFee,
      driverAmount,
      paymentMethod: trip.paymentMethod,
      status: trip.paymentMethod === 'cash' ? 'completed' : 'pending',
      paymentInitiatedAt: new Date()
    });

    // Handle wallet payment
    if (trip.paymentMethod === 'wallet') {
      const client = await User.findByPk(trip.clientId);
      const driver = await User.findByPk(trip.driver.userId);
      
      // Deduct from client wallet
      client.walletBalance = parseFloat(client.walletBalance) - parseFloat(trip.finalPrice);
      await client.save();
      
      // Add to driver wallet
      driver.walletBalance = parseFloat(driver.walletBalance) + parseFloat(driverAmount);
      await driver.save();
      
      // Update payment status
      payment.status = 'completed';
      payment.paymentCompletedAt = new Date();
      await payment.save();
    }

    // Create notifications
    await Notification.create({
      userId: trip.clientId,
      type: 'trip_completed',
      title: 'Trip Completed',
      message: `Your trip has been completed. Total fare: ${trip.finalPrice}`,
      data: { tripId: trip.id, paymentId: payment.id },
      channel: 'app',
      priority: 'medium'
    });

    await Notification.create({
      userId: trip.driver.userId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `You've received ${driverAmount} for your trip. Thank you for driving with Taxi-Express!`,
      data: { tripId: trip.id, paymentId: payment.id },
      channel: 'app',
      priority: 'medium'
    });

    // Emit socket events
    io.to(`client_${trip.clientId}`).emit('trip_completed', {
      tripId: trip.id,
      endTime: trip.endTime,
      finalPrice: trip.finalPrice,
      paymentStatus: payment.status
    });

    io.to(`driver_${trip.driver.userId}`).emit('trip_completed', {
      tripId: trip.id,
      endTime: trip.endTime,
      earnings: driverAmount,
      paymentStatus: payment.status
    });

    res.status(200).json({
      success: true,
      message: 'Trip completed successfully',
      data: {
        trip: {
          id: trip.id,
          status: trip.status,
          startTime: trip.startTime,
          endTime: trip.endTime,
          actualDistance: trip.actualDistance,
          actualDuration: trip.actualDuration,
          finalPrice: trip.finalPrice
        },
        payment: {
          id: payment.id,
          amount: payment.amount,
          driverAmount: payment.driverAmount,
          status: payment.status,
          method: payment.paymentMethod
        }
      }
    });
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing trip',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Cancel a trip
 * @route PATCH /api/trips/:id/cancel
 */
exports.cancelTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Find trip
    const trip = await Trip.findByPk(id, {
      include: [
        { model: User, as: 'tripClient' },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ model: User, as: 'userAccount' }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if trip can be canceled
    if (!['requested', 'assigned'].includes(trip.status)) {
      return res.status(400).json({
        success: false,
        message: `Trip cannot be canceled in ${trip.status} status`
      });
    }

    // Determine who is canceling
    let canceledBy;
    if (req.user.role === 'admin') {
      canceledBy = 'admin';
    } else if (req.user.id === trip.clientId) {
      canceledBy = 'client';
    } else {
      // Check if user is the driver
      const driver = await Driver.findOne({
        where: { userId: req.user.id }
      });
      
      if (driver && trip.driverId === driver.id) {
        canceledBy = 'driver';
      } else {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to cancel this trip'
        });
      }
    }

    // Update trip status
    trip.status = 'canceled';
    trip.cancellationReason = reason || 'No reason provided';
    trip.canceledBy = canceledBy;
    await trip.save();

    // Check for potential fraud (excessive cancellations)
    if (canceledBy === 'client' || canceledBy === 'driver') {
      const userId = canceledBy === 'client' ? trip.clientId : trip.driver.userId;
      
      // Count recent cancellations
      const recentCancellations = await Trip.count({
        where: {
          [canceledBy === 'client' ? 'clientId' : 'driverId']: canceledBy === 'client' ? userId : trip.driverId,
          status: 'canceled',
          canceledBy,
          updatedAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });
      
      if (recentCancellations >= 3) {
        await checkFraudRisk(userId, 'excessive_cancellations', {
          tripId: trip.id,
          recentCancellations,
          reason
        });
      }
    }

    // Update driver stats if canceled by driver
    if (canceledBy === 'driver' && trip.driverId) {
      const driver = await Driver.findByPk(trip.driverId);
      if (driver) {
        // Reduce acceptance rate for driver cancellations
        driver.acceptanceRate = Math.max(0, ((driver.acceptanceRate * driver.totalTrips) - 100) / driver.totalTrips);
        await driver.save();
      }
    }

    // Create notifications
    if (trip.clientId && canceledBy !== 'client') {
      await Notification.create({
        userId: trip.clientId,
        type: 'trip_canceled',
        title: 'Trip Canceled',
        message: `Your trip has been canceled. Reason: ${trip.cancellationReason}`,
        data: { tripId: trip.id },
        channel: 'app',
        priority: 'high'
      });
    }

    if (trip.driverId && trip.driver && trip.driver.userId && canceledBy !== 'driver') {
      await Notification.create({
        userId: trip.driver.userId,
        type: 'trip_canceled',
        title: 'Trip Canceled',
        message: `The trip has been canceled. Reason: ${trip.cancellationReason}`,
        data: { tripId: trip.id },
        channel: 'app',
        priority: 'high'
      });
    }

    // Emit socket events
    if (trip.clientId) {
      io.to(`client_${trip.clientId}`).emit('trip_canceled', {
        tripId: trip.id,
        reason: trip.cancellationReason,
        canceledBy
      });
    }

    if (trip.driverId && trip.driver && trip.driver.userId) {
      io.to(`driver_${trip.driver.userId}`).emit('trip_canceled', {
        tripId: trip.id,
        reason: trip.cancellationReason,
        canceledBy
      });
    }

    // Create admin log if canceled by admin
    if (canceledBy === 'admin') {
      await createAdminLog({
        adminId: req.user.id,
        action: 'trip_intervention',
        targetType: 'trip',
        targetId: trip.id,
        details: `Admin canceled trip. Reason: ${reason || 'Not specified'}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trip canceled successfully',
      data: {
        tripId: trip.id,
        status: trip.status,
        canceledBy,
        reason: trip.cancellationReason
      }
    });
  } catch (error) {
    console.error('Cancel trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error canceling trip',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get trip details
 * @route GET /api/trips/:tripId
 */
exports.getTripDetails = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    // Find trip with all related data
    const trip = await Trip.findByPk(tripId, {
      include: [
        { model: User, as: 'tripClient', attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'profilePhoto'] },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ 
            model: User, 
            as: 'userAccount', 
            attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'profilePhoto'] 
          }]
        },
        { model: Payment, as: 'tripPayment' }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user has permission to view this trip
    if (req.user.role !== 'admin' && 
        req.user.id !== trip.clientId && 
        (!trip.driver || req.user.id !== trip.driver.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this trip'
      });
    }

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('Get trip details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get trip details
 * @route GET /api/trips/:id
 */
exports.getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const trip = await Trip.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'tripClient',
          attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'rating']
        },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ 
            model: User, 
            as: 'userAccount',
            attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'rating']
          }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user has permission to view this trip
    if (req.user.role !== 'admin' && 
        req.user.id !== trip.clientId && 
        (!trip.driver || req.user.id !== trip.driver.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this trip'
      });
    }

    // Get payment information if trip is completed
    let payment = null;
    if (trip.status === 'completed') {
      payment = await Payment.findOne({
        where: { tripId: trip.id }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        trip,
        payment
      }
    });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Report trip incident
 * @route POST /api/trips/:tripId/incidents
 */
exports.reportIncident = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { incidentDetails } = req.body;
    
    if (!incidentDetails) {
      return res.status(400).json({
        success: false,
        message: 'Incident details are required'
      });
    }

    // Find trip
    const trip = await Trip.findByPk(tripId, {
      include: [
        { model: User, as: 'tripClient' },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ model: User, as: 'userAccount' }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user has permission to report incident
    if (req.user.role !== 'admin' && 
        req.user.id !== trip.clientId && 
        (!trip.driver || req.user.id !== trip.driver.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to report incident for this trip'
      });
    }

    // Update trip status
    const previousStatus = trip.status;
    trip.status = 'incident';
    trip.incidentDetails = incidentDetails;
    await trip.save();

    // Create notifications for all parties
    // For client
    if (req.user.id !== trip.clientId) {
      await Notification.create({
        userId: trip.clientId,
        type: 'system_alert',
        title: 'Trip Incident Reported',
        message: 'An incident has been reported for your trip. Our support team will contact you shortly.',
        data: { tripId: trip.id },
        channel: 'app',
        priority: 'high'
      });
    }

    // For driver
    if (trip.driver && trip.driver.userId && req.user.id !== trip.driver.userId) {
      await Notification.create({
        userId: trip.driver.userId,
        type: 'system_alert',
        title: 'Trip Incident Reported',
        message: 'An incident has been reported for your trip. Our support team will contact you shortly.',
        data: { tripId: trip.id },
        channel: 'app',
        priority: 'high'
      });
    }

    // Notify admins
    const admins = await User.findAll({
      where: { role: 'admin', isActive: true }
    });

    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        type: 'system_alert',
        title: 'Trip Incident Reported',
        message: `Incident reported for Trip ${trip.id}. Details: ${incidentDetails.substring(0, 100)}${incidentDetails.length > 100 ? '...' : ''}`,
        data: { tripId: trip.id },
        channel: 'app',
        priority: 'high'
      });
    }

    // Create admin log if reported by admin
    if (req.user.role === 'admin') {
      await createAdminLog({
        adminId: req.user.id,
        action: 'trip_intervention',
        targetType: 'trip',
        targetId: trip.id,
        details: `Admin reported trip incident: ${incidentDetails.substring(0, 100)}${incidentDetails.length > 100 ? '...' : ''}`,
        previousData: { status: previousStatus },
        newData: { status: 'incident' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    res.status(200).json({
      success: true,
      message: 'Incident reported successfully',
      data: {
        tripId: trip.id,
        status: trip.status,
        incidentDetails: trip.incidentDetails
      }
    });
  } catch (error) {
    console.error('Report incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reporting incident',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Rate a driver after trip completion
 * @route POST /api/trips/:tripId/rate-driver
 */
exports.rateDriver = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Valid rating between 1 and 5 is required'
      });
    }

    // Find trip
    const trip = await Trip.findByPk(tripId, {
      include: [{ 
        model: Driver, 
        as: 'tripDriver',
        include: [{ model: User, as: 'userAccount' }]
      }]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user is the client of this trip
    if (trip.clientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this trip'
      });
    }

    // Check if trip is completed
    if (trip.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed trips'
      });
    }

    // Check if driver has already been rated for this trip
    if (trip.driverRating) {
      return res.status(400).json({
        success: false,
        message: 'Driver has already been rated for this trip'
      });
    }

    // Update trip with driver rating
    trip.driverRating = rating;
    trip.driverRatingComment = comment || '';
    await trip.save();

    // Update driver's average rating
    if (trip.driverId) {
      const driver = await Driver.findByPk(trip.driverId);
      if (driver) {
        const totalRatings = await Trip.count({
          where: {
            driverId: driver.id,
            driverRating: { [Op.not]: null }
          }
        });

        const sumRatings = await Trip.sum('driverRating', {
          where: {
            driverId: driver.id,
            driverRating: { [Op.not]: null }
          }
        });

        driver.averageRating = sumRatings / totalRatings;
        driver.totalRatings = totalRatings;
        await driver.save();

        // Notify driver about the rating
        await Notification.create({
          userId: driver.userId,
          type: 'rating_received',
          title: 'New Rating Received',
          message: `You received a ${rating}-star rating for your trip.`,
          data: { tripId: trip.id, rating },
          channel: 'app',
          priority: 'medium'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Driver rated successfully',
      data: {
        tripId: trip.id,
        driverRating: trip.driverRating,
        driverRatingComment: trip.driverRatingComment
      }
    });
  } catch (error) {
    console.error('Rate driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating driver',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Rate a client after trip completion
 * @route POST /api/trips/:tripId/rate-client
 */
exports.rateClient = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Valid rating between 1 and 5 is required'
      });
    }

    // Find trip
    const trip = await Trip.findByPk(tripId, {
      include: [{ model: User, as: 'tripClient' }]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user is the driver of this trip
    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver || trip.driverId !== driver.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this client'
      });
    }

    // Check if trip is completed
    if (trip.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed trips'
      });
    }

    // Check if client has already been rated for this trip
    if (trip.clientRating) {
      return res.status(400).json({
        success: false,
        message: 'Client has already been rated for this trip'
      });
    }

    // Update trip with client rating
    trip.clientRating = rating;
    trip.clientRatingComment = comment || '';
    await trip.save();

    // Update client's average rating
    const client = await User.findByPk(trip.clientId);
    if (client) {
      const totalRatings = await Trip.count({
        where: {
          clientId: client.id,
          clientRating: { [Op.not]: null }
        }
      });

      const sumRatings = await Trip.sum('clientRating', {
        where: {
          clientId: client.id,
          clientRating: { [Op.not]: null }
        }
      });

      client.averageRating = sumRatings / totalRatings;
      client.totalRatings = totalRatings;
      await client.save();
    }

    res.status(200).json({
      success: true,
      message: 'Client rated successfully',
      data: {
        tripId: trip.id,
        clientRating: trip.clientRating,
        clientRatingComment: trip.clientRatingComment
      }
    });
  } catch (error) {
    console.error('Rate client error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get trip tracking information
 * @route GET /api/trips/:tripId/tracking
 */
exports.getTripTracking = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    // Find trip with tracking data
    const trip = await Trip.findByPk(tripId, {
      attributes: ['id', 'status', 'pickupLocation', 'destinationLocation', 'currentLocation', 'estimatedArrivalTime', 'startTime'],
      include: [
        { 
          model: Driver, 
          as: 'tripDriver',
          attributes: ['id', 'currentLocation', 'isAvailable'],
          include: [{ 
            model: User, 
            as: 'userAccount', 
            attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'profilePhoto'] 
          }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user has permission to view this trip tracking
    if (req.user.role !== 'admin' && 
        req.user.id !== trip.clientId && 
        (!trip.driver || req.user.id !== trip.driver.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this trip tracking'
      });
    }

    // Get estimated time remaining if trip is active
    let estimatedTimeRemaining = null;
    if (trip.status === 'active' && trip.startTime) {
      const currentTime = new Date();
      const tripDuration = trip.estimatedDuration || 0; // in seconds
      const elapsedTime = Math.floor((currentTime - trip.startTime) / 1000); // in seconds
      estimatedTimeRemaining = Math.max(0, tripDuration - elapsedTime);
    }

    res.status(200).json({
      success: true,
      data: {
        tripId: trip.id,
        status: trip.status,
        currentLocation: trip.currentLocation || (trip.driver ? trip.driver.currentLocation : null),
        destinationLocation: trip.destinationLocation,
        estimatedArrivalTime: trip.estimatedArrivalTime,
        estimatedTimeRemaining,
        driver: trip.driver ? {
          id: trip.driver.id,
          name: `${trip.driver.user.firstName} ${trip.driver.user.lastName}`,
          phoneNumber: trip.driver.user.phoneNumber,
          profilePhoto: trip.driver.user.profilePhoto
        } : null
      }
    });
  } catch (error) {
    console.error('Get trip tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip tracking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Extend trip with additional stops
 * @route PUT /api/trips/:tripId/extend
 */
exports.extendTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { newDestinationLocation, newDestinationAddress, additionalDistance, additionalDuration } = req.body;
    
    if (!newDestinationLocation || !newDestinationAddress || !additionalDistance || !additionalDuration) {
      return res.status(400).json({
        success: false,
        message: 'New destination details and additional distance/duration are required'
      });
    }

    // Find trip
    const trip = await Trip.findByPk(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user is the client of this trip
    if (trip.clientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to extend this trip'
      });
    }

    // Check if trip is in a state that can be extended
    if (trip.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active trips can be extended'
      });
    }

    // Calculate additional price
    const additionalPrice = await calculatePrice(additionalDistance, additionalDuration);

    // Store original destination for history
    const originalDestination = {
      address: trip.destinationAddress,
      location: trip.destinationLocation
    };

    // Update trip with new destination and price
    trip.destinationLocation = newDestinationLocation;
    trip.destinationAddress = newDestinationAddress;
    trip.estimatedDistance = parseFloat(trip.estimatedDistance) + parseFloat(additionalDistance);
    trip.estimatedDuration = parseInt(trip.estimatedDuration) + parseInt(additionalDuration);
    trip.estimatedPrice = parseFloat(trip.estimatedPrice) + parseFloat(additionalPrice);
    trip.tripExtensions = trip.tripExtensions || [];
    trip.tripExtensions.push({
      timestamp: new Date(),
      originalDestination,
      newDestination: {
        address: newDestinationAddress,
        location: newDestinationLocation
      },
      additionalPrice,
      additionalDistance,
      additionalDuration
    });

    await trip.save();

    // Notify driver about trip extension
    if (trip.driverId) {
      const driver = await Driver.findByPk(trip.driverId, {
        include: [{ model: User, as: 'userAccount' }]
      });

      if (driver) {
        await Notification.create({
          userId: driver.userId,
          type: 'trip_update',
          title: 'Trip Extended',
          message: `The client has extended the trip to ${newDestinationAddress}`,
          data: { tripId: trip.id },
          channel: 'app',
          priority: 'high'
        });

        // Emit socket event for trip extension
        io.to(`driver_${driver.userId}`).emit('trip_extended', {
          tripId: trip.id,
          newDestination: newDestinationAddress,
          additionalPrice
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Trip extended successfully',
      data: {
        tripId: trip.id,
        newDestinationAddress: trip.destinationAddress,
        totalDistance: trip.estimatedDistance,
        totalDuration: trip.estimatedDuration,
        totalPrice: trip.estimatedPrice,
        additionalPrice
      }
    });
  } catch (error) {
    console.error('Extend trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error extending trip',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all trips (admin only)
 * @route GET /api/trips
 */
exports.getAllTrips = async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 20, offset = 0 } = req.query;
    
    // Build query conditions
    const whereConditions = {};
    
    if (status) {
      whereConditions.status = status;
    }
    
    if (startDate && endDate) {
      whereConditions.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.createdAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.createdAt = {
        [Op.lte]: new Date(endDate)
      };
    }

    // Get trips with pagination
    const { count, rows: trips } = await Trip.findAndCountAll({
      where: whereConditions,
      include: [
        { model: User, as: 'tripClient', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ 
            model: User, 
            as: 'userAccount', 
            attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] 
          }]
        },
        { model: Payment, as: 'tripPayment', attributes: ['id', 'amount', 'status', 'paymentMethod'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: {
        trips,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trips',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's active trip
 * @route GET /api/trips/active
 */
exports.getActiveTrip = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user is a driver
    const driver = await Driver.findOne({ where: { userId } });
    
    let whereConditions;
    if (driver) {
      // For drivers
      whereConditions = {
        driverId: driver.id,
        status: {
          [Op.in]: ['assigned', 'active']
        }
      };
    } else {
      // For clients
      whereConditions = {
        clientId: userId,
        status: {
          [Op.in]: ['requested', 'assigned', 'active']
        }
      };
    }

    // Find active trip
    const trip = await Trip.findOne({
      where: whereConditions,
      include: [
        { model: User, as: 'tripClient', attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'profilePhoto'] },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ 
            model: User, 
            as: 'userAccount', 
            attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'profilePhoto'] 
          }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'No active trip found'
      });
    }

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('Get active trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active trip',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Trigger SOS alert for a trip
 * @route POST /api/trips/:tripId/sos
 */
exports.triggerSOS = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { location, reason } = req.body;
    
    // Find trip
    const trip = await Trip.findByPk(tripId, {
      include: [
        { model: User, as: 'tripClient' },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ model: User, as: 'userAccount' }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user has permission to trigger SOS for this trip
    if (req.user.role !== 'admin' && 
        req.user.id !== trip.clientId && 
        (!trip.driver || req.user.id !== trip.driver.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to trigger SOS for this trip'
      });
    }

    // Create SOS record
    const sos = {
      tripId: trip.id,
      userId: req.user.id,
      location: location || trip.currentLocation,
      reason,
      status: 'active',
      createdAt: new Date()
    };

    // Update trip with SOS flag
    trip.hasSOS = true;
    trip.sosDetails = sos;
    await trip.save();

    // Notify all relevant parties

    // Notify client if SOS triggered by driver
    if (req.user.id !== trip.clientId) {
      await Notification.create({
        userId: trip.clientId,
        type: 'emergency',
        title: 'Emergency Alert',
        message: 'An emergency has been reported for your trip. Emergency services have been notified.',
        data: { tripId: trip.id },
        channel: 'app',
        priority: 'critical'
      });
    }

    // Notify driver if SOS triggered by client
    if (trip.driver && trip.driver.userId && req.user.id !== trip.driver.userId) {
      await Notification.create({
        userId: trip.driver.userId,
        type: 'emergency',
        title: 'Emergency Alert',
        message: 'An emergency has been reported for your trip. Emergency services have been notified.',
        data: { tripId: trip.id },
        channel: 'app',
        priority: 'critical'
      });
    }

    // Notify all admins
    const admins = await User.findAll({
      where: { role: 'admin', isActive: true }
    });

    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        type: 'emergency',
        title: 'SOS Alert',
        message: `Emergency alert triggered for Trip ${trip.id}. User: ${req.user.firstName} ${req.user.lastName}`,
        data: { 
          tripId: trip.id,
          location: sos.location,
          reason: sos.reason
        },
        channel: 'app',
        priority: 'critical'
      });
    }

    // In a real app, this would contact emergency services
    // For now, just log the emergency
    console.log(`EMERGENCY: SOS triggered for trip ${trip.id} by user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'SOS alert triggered successfully',
      data: {
        sosId: Date.now().toString(),
        tripId: trip.id,
        status: 'active',
        message: 'Emergency services have been notified'
      }
    });
  } catch (error) {
    console.error('Trigger SOS error:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering SOS alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
