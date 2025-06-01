/**
 * Notification Service for Taxi-Express
 * Handles real-time notifications, push notifications, and SMS notifications
 */

const { Notification, User, Driver } = require('../models');
const { sendSMS } = require('./sms.service');
const { io } = require('../server');

/**
 * Send a notification to a user
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 * @param {string} channel - Notification channel (app, sms, push, email)
 * @param {string} priority - Notification priority (low, medium, high)
 * @returns {Promise<Object>} Notification object
 */
exports.sendNotification = async (userId, type, title, message, data = {}, channel = 'app', priority = 'medium') => {
  try {
    // Create notification in database
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      channel,
      priority,
      isRead: false,
      createdAt: new Date()
    });

    // Send real-time notification via Socket.IO
    if (channel === 'app' || channel === 'all') {
      io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        type,
        title,
        message,
        data,
        priority,
        timestamp: notification.createdAt
      });
    }

    // Send SMS notification
    if (channel === 'sms' || channel === 'all') {
      const user = await User.findByPk(userId);
      if (user && user.phoneNumber) {
        await sendSMS(
          user.phoneNumber,
          message,
          user.preferredLanguage || 'fr'
        );
      }
    }

    // Send push notification
    if (channel === 'push' || channel === 'all') {
      await this.sendPushNotification(userId, title, message, data, priority);
    }

    return notification;
  } catch (error) {
    console.error('Send notification error:', error);
    throw error;
  }
};

/**
 * Send a notification to a driver
 * @param {string} driverId - Driver ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 * @param {string} channel - Notification channel (app, sms, push, email)
 * @param {string} priority - Notification priority (low, medium, high)
 * @returns {Promise<Object>} Notification object
 */
exports.sendDriverNotification = async (driverId, type, title, message, data = {}, channel = 'app', priority = 'medium') => {
  try {
    // Get driver's user ID
    const driver = await Driver.findByPk(driverId, {
      attributes: ['userId']
    });

    if (!driver) {
      throw new Error(`Driver not found: ${driverId}`);
    }

    // Send notification to driver's user account
    return this.sendNotification(driver.userId, type, title, message, data, channel, priority);
  } catch (error) {
    console.error('Send driver notification error:', error);
    throw error;
  }
};

/**
 * Send a notification to all drivers
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 * @param {string} channel - Notification channel (app, sms, push, email)
 * @param {string} priority - Notification priority (low, medium, high)
 * @returns {Promise<Array>} Array of notification objects
 */
exports.sendNotificationToAllDrivers = async (type, title, message, data = {}, channel = 'app', priority = 'medium') => {
  try {
    // Get all active drivers
    const drivers = await Driver.findAll({
      where: { isActive: true },
      attributes: ['id', 'userId']
    });

    // Send notification to each driver
    const notifications = [];
    for (const driver of drivers) {
      const notification = await this.sendNotification(
        driver.userId,
        type,
        title,
        message,
        data,
        channel,
        priority
      );
      notifications.push(notification);
    }

    // Also broadcast to all drivers via Socket.IO
    io.to('drivers').emit('broadcast_notification', {
      type,
      title,
      message,
      data,
      priority,
      timestamp: new Date()
    });

    return notifications;
  } catch (error) {
    console.error('Send notification to all drivers error:', error);
    throw error;
  }
};

/**
 * Send a push notification
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 * @param {string} priority - Notification priority (low, medium, high)
 * @returns {Promise<Object>} Push notification result
 */
exports.sendPushNotification = async (userId, title, message, data = {}, priority = 'medium') => {
  try {
    // Get user's push token
    const user = await User.findByPk(userId, {
      attributes: ['id', 'pushToken', 'deviceType']
    });

    if (!user || !user.pushToken) {
      console.log(`No push token found for user: ${userId}`);
      return null;
    }

    // In a real implementation, this would integrate with FCM or APN
    // For now, we'll simulate the push notification
    console.log(`Sending push notification to user ${userId}:`, {
      token: user.pushToken,
      platform: user.deviceType,
      title,
      message,
      data,
      priority
    });

    // Simulate push notification
    const pushResult = {
      success: true,
      messageId: `push-${Date.now()}`,
      timestamp: new Date()
    };

    return pushResult;
  } catch (error) {
    console.error('Send push notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send a trip notification
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 * @param {string} channel - Notification channel (app, sms, push, email)
 * @param {string} priority - Notification priority (low, medium, high)
 * @returns {Promise<Object>} Notification object
 */
exports.sendTripNotification = async (tripId, userId, type, title, message, data = {}, channel = 'app', priority = 'medium') => {
  try {
    // Add trip ID to data
    const notificationData = {
      ...data,
      tripId
    };

    // Create notification
    const notification = await this.sendNotification(
      userId,
      type,
      title,
      message,
      notificationData,
      channel,
      priority
    );

    // Also send to trip room
    io.to(`trip_${tripId}`).emit('trip_notification', {
      id: notification.id,
      tripId,
      type,
      title,
      message,
      data: notificationData,
      priority,
      timestamp: notification.createdAt
    });

    return notification;
  } catch (error) {
    console.error('Send trip notification error:', error);
    throw error;
  }
};

/**
 * Mark notifications as read
 * @param {string} userId - User ID
 * @param {Array} notificationIds - Array of notification IDs to mark as read
 * @returns {Promise<number>} Number of notifications marked as read
 */
exports.markNotificationsAsRead = async (userId, notificationIds = []) => {
  try {
    let updateQuery = {
      where: {
        userId,
        isRead: false
      },
      returning: true
    };

    // If specific notification IDs are provided, only mark those as read
    if (notificationIds && notificationIds.length > 0) {
      updateQuery.where.id = notificationIds;
    }

    // Update notifications
    const [updatedCount] = await Notification.update(
      { isRead: true, readAt: new Date() },
      updateQuery
    );

    return updatedCount;
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    throw error;
  }
};

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread notification count
 */
exports.getUnreadNotificationCount = async (userId) => {
  try {
    const count = await Notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    return count;
  } catch (error) {
    console.error('Get unread notification count error:', error);
    throw error;
  }
};

/**
 * Send a location update notification
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID receiving the notification
 * @param {Object} location - Location object with coordinates
 * @param {string} userType - Type of user sending the location (driver or client)
 * @returns {Promise<Object>} Notification object
 */
exports.sendLocationUpdateNotification = async (tripId, userId, location, userType) => {
  try {
    const title = userType === 'driver' 
      ? 'Position du chauffeur mise à jour' 
      : 'Position du client mise à jour';
    
    const message = userType === 'driver'
      ? 'Le chauffeur a mis à jour sa position'
      : 'Le client a mis à jour sa position';
    
    return this.sendTripNotification(
      tripId,
      userId,
      'location_update',
      title,
      message,
      { location, userType },
      'app',
      'low'
    );
  } catch (error) {
    console.error('Send location update notification error:', error);
    throw error;
  }
};

/**
 * Send a chat message notification
 * @param {string} tripId - Trip ID
 * @param {string} recipientId - User ID receiving the notification
 * @param {string} senderId - User ID sending the message
 * @param {string} message - Message content
 * @param {string} senderType - Type of sender (driver or client)
 * @returns {Promise<Object>} Notification object
 */
exports.sendChatMessageNotification = async (tripId, recipientId, senderId, message, senderType) => {
  try {
    const title = senderType === 'driver' 
      ? 'Nouveau message du chauffeur' 
      : 'Nouveau message du client';
    
    // Truncate message if too long
    const truncatedMessage = message.length > 50 
      ? `${message.substring(0, 47)}...` 
      : message;
    
    return this.sendTripNotification(
      tripId,
      recipientId,
      'chat_message',
      title,
      truncatedMessage,
      { senderId, senderType },
      'all', // Send via app, push, and SMS
      'medium'
    );
  } catch (error) {
    console.error('Send chat message notification error:', error);
    throw error;
  }
};
