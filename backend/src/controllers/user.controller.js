/**
 * User Controller for Taxi-Express
 * Handles user profile management and related operations
 */

const { User, Trip, Payment, Notification } = require('../models');
const { validateUserUpdate } = require('../utils/validators');
const { createAdminLog } = require('../services/admin.service');
const { checkFraudRisk } = require('../services/fraud.service');
const { Op } = require('sequelize');

/**
 * Get user profile
 * @route GET /api/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has permission (admin or self)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this profile'
      });
    }

    const user = await User.findByPk(id, {
      attributes: { 
        exclude: ['password', 'verificationToken', 'resetPasswordToken', 'resetPasswordExpires'] 
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile
 * @route PATCH /api/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has permission (admin or self)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    // Validate request body
    const { error } = validateUserUpdate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store previous data for admin log
    const previousData = { ...user.toJSON() };

    // Fields that can be updated
    const allowedFields = [
      'firstName', 'lastName', 'phoneNumber', 'preferredLanguage'
    ];
    
    // Additional fields for admin
    if (req.user.role === 'admin') {
      allowedFields.push('isActive', 'role', 'fraudScore');
    }

    // Update allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    // Create admin log if admin is making the update
    if (req.user.role === 'admin') {
      await createAdminLog({
        adminId: req.user.id,
        action: 'user_update',
        targetType: 'user',
        targetId: user.id,
        details: `Admin updated user profile for ${user.email}`,
        previousData,
        newData: user.toJSON(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user trip history
 * @route GET /api/users/:id/trips
 */
exports.getUserTrips = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Check if user has permission (admin or self)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this data'
      });
    }

    // Build query conditions
    const where = { clientId: id };
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
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'userId', 'vehicleType', 'vehicleMake', 'vehicleModel'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'rating']
            }
          ]
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
    console.error('Get user trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user trips',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user payment history
 * @route GET /api/users/:id/payments
 */
exports.getUserPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Check if user has permission (admin or self)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this data'
      });
    }

    // Build query conditions
    const where = { clientId: id };
    if (status) {
      where.status = status;
    }

    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get payments with pagination
    const { count, rows: payments } = await Payment.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'pickupAddress', 'destinationAddress', 'status', 'startTime', 'endTime']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user notifications
 * @route GET /api/users/:id/notifications
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const { id } = req.params;
    const { read, page = 1, limit = 20 } = req.query;
    
    // Check if user has permission (admin or self)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this data'
      });
    }

    // Build query conditions
    const where = { userId: id };
    if (read !== undefined) {
      where.isRead = read === 'true';
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
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark notification as read
 * @route PATCH /api/users/:userId/notifications/:notificationId
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    
    // Check if user has permission (admin or self)
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user wallet balance
 * @route PATCH /api/users/:id/wallet
 */
exports.updateWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, operation, reason } = req.body;
    
    // Validate request
    if (!amount || !operation || !['add', 'subtract'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Amount and valid operation (add/subtract) are required.'
      });
    }

    // Only admin can update wallet balance
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update wallet balance'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store previous data for admin log
    const previousBalance = user.walletBalance;

    // Update wallet balance
    if (operation === 'add') {
      user.walletBalance = parseFloat(user.walletBalance) + parseFloat(amount);
    } else {
      // Check if enough balance
      if (parseFloat(user.walletBalance) < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }
      user.walletBalance = parseFloat(user.walletBalance) - parseFloat(amount);
    }

    await user.save();

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'user_update',
      targetType: 'user',
      targetId: user.id,
      details: `Admin ${operation === 'add' ? 'added' : 'subtracted'} ${amount} to wallet balance. Reason: ${reason || 'Not specified'}`,
      previousData: { walletBalance: previousBalance },
      newData: { walletBalance: user.walletBalance },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Create notification for user
    await Notification.create({
      userId: user.id,
      type: 'account_update',
      title: 'Wallet Balance Updated',
      message: `Your wallet balance has been ${operation === 'add' ? 'increased' : 'decreased'} by ${amount}. New balance: ${user.walletBalance}`,
      channel: 'app',
      priority: 'medium'
    });

    res.status(200).json({
      success: true,
      message: 'Wallet balance updated successfully',
      data: {
        userId: user.id,
        previousBalance,
        currentBalance: user.walletBalance,
        operation,
        amount
      }
    });
  } catch (error) {
    console.error('Update wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating wallet balance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change user password
 * @route PATCH /api/users/:id/password
 */
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    // Check if user has permission (self only)
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change this password'
      });
    }

    // Validate request
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Create notification for user
    await Notification.create({
      userId: user.id,
      type: 'account_update',
      title: 'Password Changed',
      message: 'Your password has been changed successfully. If you did not make this change, please contact support immediately.',
      channel: 'app',
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Deactivate user account
 * @route PATCH /api/users/:id/deactivate
 */
exports.deactivateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Check if user has permission (admin or self)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to deactivate this account'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store previous data for admin log
    const previousData = { isActive: user.isActive };

    // Deactivate account
    user.isActive = false;
    await user.save();

    // Create admin log if admin is deactivating
    if (req.user.role === 'admin') {
      await createAdminLog({
        adminId: req.user.id,
        action: 'user_block',
        targetType: 'user',
        targetId: user.id,
        details: `Admin deactivated user account. Reason: ${reason || 'Not specified'}`,
        previousData,
        newData: { isActive: user.isActive },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Check for fraud risk if self-deactivation
    if (req.user.id === id) {
      await checkFraudRisk(user.id, 'account_deactivation', {
        reason: reason || 'User initiated',
        deactivatedAt: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
