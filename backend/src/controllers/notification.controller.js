/**
 * Notification Controller for Taxi-Express
 * Handles notification management, delivery, and preferences
 */

const { Notification, User } = require('../models');
const { Op } = require('sequelize');
const { io } = require('../server');

/**
 * Get user notifications
 * @route GET /api/notifications
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    
    // Build query conditions
    const where = { userId: req.user.id };
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.type = type;
    }
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get notifications with pagination
    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark notification as read
 * @route PATCH /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByPk(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check if user owns this notification
    if (notification.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }
    
    // Update notification status
    notification.status = 'read';
    notification.readAt = new Date();
    await notification.save();
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: {
        id: notification.id,
        status: notification.status,
        readAt: notification.readAt
      }
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
  try {
    // Update all unread notifications for the user
    const result = await Notification.update(
      {
        status: 'read',
        readAt: new Date()
      },
      {
        where: {
          userId: req.user.id,
          status: 'unread'
        }
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        count: result[0]
      }
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a notification
 * @route DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByPk(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check if user owns this notification
    if (notification.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }
    
    // Delete notification
    await notification.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update notification preferences
 * @route PATCH /api/notifications/preferences
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { 
      emailNotifications, 
      smsNotifications, 
      appNotifications,
      tripUpdates,
      paymentUpdates,
      promotions,
      systemAlerts
    } = req.body;
    
    // Get user
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update notification preferences
    const notificationPreferences = user.notificationPreferences || {};
    
    if (emailNotifications !== undefined) notificationPreferences.email = emailNotifications;
    if (smsNotifications !== undefined) notificationPreferences.sms = smsNotifications;
    if (appNotifications !== undefined) notificationPreferences.app = appNotifications;
    
    // Update notification types preferences
    notificationPreferences.types = notificationPreferences.types || {};
    if (tripUpdates !== undefined) notificationPreferences.types.tripUpdates = tripUpdates;
    if (paymentUpdates !== undefined) notificationPreferences.types.paymentUpdates = paymentUpdates;
    if (promotions !== undefined) notificationPreferences.types.promotions = promotions;
    if (systemAlerts !== undefined) notificationPreferences.types.systemAlerts = systemAlerts;
    
    // Save updated preferences
    user.notificationPreferences = notificationPreferences;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        notificationPreferences
      }
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get notification count
 * @route GET /api/notifications/count
 */
exports.getNotificationCount = async (req, res) => {
  try {
    // Count unread notifications
    const unreadCount = await Notification.count({
      where: {
        userId: req.user.id,
        status: 'unread'
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send a notification (admin only)
 * @route POST /api/notifications/send
 */
exports.sendNotification = async (req, res) => {
  try {
    const { 
      userId, 
      userType,
      title, 
      message, 
      type = 'system_alert', 
      priority = 'medium',
      data = {}
    } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can send notifications'
      });
    }
    
    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }
    
    let targetUsers = [];
    
    // Determine target users
    if (userId) {
      // Send to specific user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Target user not found'
        });
      }
      targetUsers = [user];
    } else if (userType) {
      // Send to all users of a specific type
      let whereClause = {};
      
      if (userType === 'driver') {
        whereClause = { role: 'user', isDriver: true, isActive: true };
      } else if (userType === 'client') {
        whereClause = { role: 'user', isDriver: false, isActive: true };
      } else if (userType === 'admin') {
        whereClause = { role: 'admin', isActive: true };
      } else if (userType === 'all') {
        whereClause = { isActive: true };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid user type. Must be driver, client, admin, or all'
        });
      }
      
      targetUsers = await User.findAll({ where: whereClause });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either userId or userType is required'
      });
    }
    
    // Create notifications for all target users
    const notifications = [];
    for (const user of targetUsers) {
      const notification = await Notification.create({
        userId: user.id,
        type,
        title,
        message,
        data: JSON.stringify(data),
        priority,
        channel: 'app'
      });
      
      notifications.push(notification);
      
      // Emit socket event
      io.to(`user_${user.id}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt
      });
    }
    
    res.status(201).json({
      success: true,
      message: `Notification sent to ${notifications.length} users`,
      data: {
        count: notifications.length,
        notifications
      }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
