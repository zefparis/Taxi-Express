/**
 * Chat Service for Taxi-Express
 * Handles real-time messaging between drivers and clients
 */

const { User, Trip, Notification } = require('../models');
const { io } = require('../server');

/**
 * Send a message between trip participants
 * @param {string} tripId - ID of the trip
 * @param {string} senderId - ID of the message sender
 * @param {string} message - Message content
 * @param {string} messageType - Type of message (text, location, image)
 * @returns {Promise<Object>} Message object
 */
exports.sendMessage = async (tripId, senderId, message, messageType = 'text') => {
  try {
    // Validate trip and sender
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
      throw new Error(`Trip not found: ${tripId}`);
    }

    // Verify sender is part of the trip
    const isClient = trip.clientId === senderId;
    const isDriver = trip.driver && trip.driver.userId === senderId;

    if (!isClient && !isDriver) {
      throw new Error('Sender is not a participant in this trip');
    }

    // Create message object
    const messageObj = {
      id: Date.now().toString(),
      tripId,
      senderId,
      senderType: isClient ? 'client' : 'driver',
      senderName: isClient 
        ? `${trip.client.firstName} ${trip.client.lastName}`
        : `${trip.driver.user.firstName} ${trip.driver.user.lastName}`,
      message,
      messageType,
      timestamp: new Date(),
      status: 'sent'
    };

    // Determine recipient
    const recipientId = isClient ? trip.driver.userId : trip.clientId;

    // Emit message via socket
    io.to(`user_${recipientId}`).emit('new_message', messageObj);
    io.to(`user_${senderId}`).emit('message_sent', messageObj);

    // Create notification for recipient
    await Notification.create({
      userId: recipientId,
      type: 'chat_message',
      title: 'New Message',
      message: `New message from ${messageObj.senderName}`,
      data: { 
        tripId,
        messageId: messageObj.id,
        senderId,
        preview: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      },
      channel: 'app',
      priority: 'medium'
    });

    return messageObj;
  } catch (error) {
    console.error('Send message error:', error);
    throw error;
  }
};

/**
 * Get chat history for a trip
 * @param {string} tripId - ID of the trip
 * @param {string} userId - ID of the requesting user
 * @returns {Promise<Array>} Array of messages
 */
exports.getChatHistory = async (tripId, userId) => {
  try {
    // Validate trip and user
    const trip = await Trip.findByPk(tripId);
    
    if (!trip) {
      throw new Error(`Trip not found: ${tripId}`);
    }

    // Verify user is part of the trip
    const driver = await Driver.findOne({ where: { userId } });
    const isClient = trip.clientId === userId;
    const isDriver = driver && trip.driverId === driver.id;

    if (!isClient && !isDriver && !isAdmin) {
      throw new Error('User is not authorized to access this chat');
    }

    // In a real app, fetch messages from database
    // For now, return a placeholder response
    return [
      {
        id: '1',
        tripId,
        senderId: trip.clientId,
        senderType: 'client',
        message: 'Bonjour, je suis arrivé au point de rendez-vous',
        messageType: 'text',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        status: 'delivered'
      },
      {
        id: '2',
        tripId,
        senderId: trip.driverId,
        senderType: 'driver',
        message: 'D\'accord, j\'arrive dans 2 minutes',
        messageType: 'text',
        timestamp: new Date(Date.now() - 240000), // 4 minutes ago
        status: 'delivered'
      }
    ];
  } catch (error) {
    console.error('Get chat history error:', error);
    throw error;
  }
};

/**
 * Setup socket handlers for chat
 * @param {Object} socket - Socket.io socket
 * @param {string} userId - ID of the connected user
 */
exports.setupChatHandlers = (socket, userId) => {
  // Join user's room
  socket.join(`user_${userId}`);

  // Handle new message
  socket.on('send_message', async (data) => {
    try {
      const { tripId, message, messageType } = data;
      
      if (!tripId || !message) {
        socket.emit('error', { message: 'Trip ID and message are required' });
        return;
      }

      const messageObj = await this.sendMessage(tripId, userId, message, messageType);
      socket.emit('message_sent', messageObj);
    } catch (error) {
      console.error('Socket send message error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle typing indicator
  socket.on('typing', async (data) => {
    try {
      const { tripId, isTyping } = data;
      
      if (!tripId) {
        socket.emit('error', { message: 'Trip ID is required' });
        return;
      }

      // Get trip participants
      const trip = await Trip.findByPk(tripId);
      
      if (!trip) {
        socket.emit('error', { message: 'Trip not found' });
        return;
      }

      // Determine recipient
      const driver = await Driver.findOne({ where: { userId } });
      const isClient = trip.clientId === userId;
      const isDriver = driver && trip.driverId === driver.id;
      
      if (!isClient && !isDriver) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const recipientId = isClient ? trip.driverId : trip.clientId;
      
      // Emit typing indicator to recipient
      io.to(`user_${recipientId}`).emit('typing_indicator', {
        tripId,
        userId,
        isTyping
      });
    } catch (error) {
      console.error('Socket typing indicator error:', error);
      socket.emit('error', { message: error.message });
    }
  });
};
