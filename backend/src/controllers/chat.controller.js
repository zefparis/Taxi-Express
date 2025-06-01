/**
 * Chat Controller for Taxi-Express
 * Handles chat functionality between drivers and clients
 */

const { Trip, User, Driver, Notification } = require('../models');
const { sendMessage, getChatHistory } = require('../services/chat.service');
const { Op } = require('sequelize');

/**
 * Send a message
 * @route POST /api/chat/send
 */
exports.sendMessage = async (req, res) => {
  try {
    const { tripId, message, messageType = 'text' } = req.body;
    
    if (!tripId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID and message are required'
      });
    }

    // Validate trip
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

    // Verify user is part of the trip
    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    const isClient = trip.clientId === req.user.id;
    const isDriver = driver && trip.driverId === driver.id;

    if (!isClient && !isDriver && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages for this trip'
      });
    }

    // Send message
    const messageObj = await sendMessage(tripId, req.user.id, message, messageType);

    res.status(201).json({
      success: true,
      data: messageObj
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get chat history
 * @route GET /api/chat/:tripId/history
 */
exports.getChatHistory = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    // Validate trip
    const trip = await Trip.findByPk(tripId);
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Verify user is part of the trip
    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    const isClient = trip.clientId === req.user.id;
    const isDriver = driver && trip.driverId === driver.id;

    if (!isClient && !isDriver && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access chat history for this trip'
      });
    }

    // Get chat history
    const messages = await getChatHistory(tripId, req.user.id);

    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark messages as read
 * @route PATCH /api/chat/:tripId/read
 */
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { messageIds } = req.body;
    
    if (!tripId || !messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID and message IDs array are required'
      });
    }

    // Validate trip
    const trip = await Trip.findByPk(tripId);
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Verify user is part of the trip
    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    const isClient = trip.clientId === req.user.id;
    const isDriver = driver && trip.driverId === driver.id;

    if (!isClient && !isDriver && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark messages for this trip'
      });
    }

    // In a real app, update message status in database
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: {
        tripId,
        messageIds,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get unread message count
 * @route GET /api/chat/unread
 */
exports.getUnreadMessageCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's active trips
    const driver = await Driver.findOne({ where: { userId } });
    
    let tripCondition;
    if (driver) {
      // For drivers
      tripCondition = { driverId: driver.id };
    } else {
      // For clients
      tripCondition = { clientId: userId };
    }
    
    // Add status condition
    tripCondition.status = {
      [Op.in]: ['assigned', 'active']
    };
    
    const activeTrips = await Trip.findAll({
      where: tripCondition,
      attributes: ['id']
    });
    
    const tripIds = activeTrips.map(trip => trip.id);
    
    // In a real app, fetch unread message count from database
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        totalUnread: tripIds.length > 0 ? Math.floor(Math.random() * 5) : 0,
        tripCounts: tripIds.map(tripId => ({
          tripId,
          unreadCount: Math.floor(Math.random() * 5)
        }))
      }
    });
  } catch (error) {
    console.error('Get unread message count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread message count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send location message
 * @route POST /api/chat/location
 */
exports.sendLocationMessage = async (req, res) => {
  try {
    const { tripId, latitude, longitude, address } = req.body;
    
    if (!tripId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID, latitude, and longitude are required'
      });
    }

    // Validate trip
    const trip = await Trip.findByPk(tripId);
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Verify user is part of the trip
    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    const isClient = trip.clientId === req.user.id;
    const isDriver = driver && trip.driverId === driver.id;

    if (!isClient && !isDriver && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages for this trip'
      });
    }

    // Create location message
    const locationData = {
      latitude,
      longitude,
      address: address || 'Current location'
    };
    
    const messageContent = JSON.stringify(locationData);
    
    // Send message
    const messageObj = await sendMessage(tripId, req.user.id, messageContent, 'location');

    res.status(201).json({
      success: true,
      data: messageObj
    });
  } catch (error) {
    console.error('Send location message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending location message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
