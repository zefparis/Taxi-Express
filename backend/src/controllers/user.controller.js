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
          as: 'tripClient',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Driver,
          as: 'tripDriver',
          attributes: ['id', 'userId', 'vehicleType', 'vehicleMake', 'vehicleModel'],
          include: [
            {
              model: User,
              as: 'userAccount',
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

/**
 * Get user profile
 * @route GET /api/users/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
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
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Fields that can be updated
    const allowedFields = [
      'firstName', 'lastName', 'phoneNumber', 'preferredLanguage'
    ];
    
    // Update allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        preferredLanguage: user.preferredLanguage
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile photo
 * @route PUT /api/users/profile/photo
 */
exports.updateProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // In a real app, handle file upload here
    // For now, just update a photoUrl field
    const { photoUrl } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Photo URL is required'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.photoUrl = photoUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        photoUrl: user.photoUrl
      }
    });
  } catch (error) {
    console.error('Update profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user trip history
 * @route GET /api/users/trips
 */
exports.getTripHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    
    const where = { userId };
    if (status) {
      where.status = status;
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows: trips } = await Trip.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
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
    console.error('Get trip history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user ratings
 * @route GET /api/users/ratings
 */
exports.getUserRatings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // In a real app, fetch ratings from a ratings model
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        averageRating: 4.7,
        totalRatings: 23,
        ratings: [
          { id: 1, score: 5, comment: 'Great passenger!', date: new Date() },
          { id: 2, score: 4, comment: 'Good communication', date: new Date() }
        ]
      }
    });
  } catch (error) {
    console.error('Get user ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user ratings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user wallet
 * @route GET /api/users/wallet
 */
exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'walletBalance']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        balance: user.walletBalance || 0,
        currency: 'XOF'
      }
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get wallet transactions
 * @route GET /api/users/wallet/transactions
 */
exports.getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // In a real app, fetch from a transactions model
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        transactions: [
          { id: 1, type: 'topup', amount: 5000, date: new Date(), status: 'completed' },
          { id: 2, type: 'payment', amount: -2500, date: new Date(), status: 'completed' }
        ],
        pagination: {
          total: 2,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 1
        }
      }
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add funds to wallet
 * @route POST /api/users/wallet/topup
 */
exports.topupWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // In a real app, process payment here
    // For now, just update the balance
    user.walletBalance = (user.walletBalance || 0) + parseFloat(amount);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Wallet topped up successfully',
      data: {
        newBalance: user.walletBalance,
        currency: 'XOF',
        transactionId: Date.now().toString()
      }
    });
  } catch (error) {
    console.error('Topup wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Error topping up wallet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a support ticket
 * @route POST /api/users/support/tickets
 */
exports.createSupportTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, message, category } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // In a real app, create a ticket in the database
    // For now, return a placeholder response
    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: {
        ticketId: Date.now().toString(),
        subject,
        status: 'open',
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating support ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user support tickets
 * @route GET /api/users/support/tickets
 */
exports.getSupportTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    
    // In a real app, fetch tickets from the database
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        tickets: [
          {
            id: '1',
            subject: 'Payment issue',
            status: 'open',
            category: 'payment',
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            id: '2',
            subject: 'Driver complaint',
            status: 'closed',
            category: 'driver',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          }
        ],
        pagination: {
          total: 2,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 1
        }
      }
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching support tickets',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a specific support ticket
 * @route GET /api/users/support/tickets/:ticketId
 */
exports.getSupportTicketById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    
    // In a real app, fetch the ticket from the database
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        id: ticketId,
        subject: 'Payment issue',
        status: 'open',
        category: 'payment',
        createdAt: new Date(),
        lastUpdated: new Date(),
        messages: [
          {
            id: '1',
            sender: 'user',
            message: 'I have an issue with my payment',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            id: '2',
            sender: 'support',
            message: 'We are looking into this issue',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
          }
        ]
      }
    });
  } catch (error) {
    console.error('Get support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching support ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add a message to a support ticket
 * @route POST /api/users/support/tickets/:ticketId/messages
 */
exports.addTicketMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // In a real app, add the message to the ticket in the database
    // For now, return a placeholder response
    res.status(201).json({
      success: true,
      message: 'Message added to ticket successfully',
      data: {
        id: Date.now().toString(),
        ticketId,
        sender: 'user',
        message,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Add ticket message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding message to ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update notification preferences
 * @route PUT /api/users/notification-preferences
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, sms, push, marketing } = req.body;
    
    // In a real app, update the preferences in the database
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        preferences: {
          email: email !== undefined ? email : true,
          sms: sms !== undefined ? sms : true,
          push: push !== undefined ? push : true,
          marketing: marketing !== undefined ? marketing : false
        }
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
 * Get favorite locations
 * @route GET /api/users/favorites
 */
exports.getFavoriteLocations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // In a real app, fetch favorites from the database
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        locations: [
          {
            id: '1',
            name: 'Home',
            address: '123 Main St, Dakar',
            latitude: 14.7167,
            longitude: -17.4677
          },
          {
            id: '2',
            name: 'Work',
            address: '456 Business Ave, Dakar',
            latitude: 14.7283,
            longitude: -17.4444
          }
        ]
      }
    });
  } catch (error) {
    console.error('Get favorite locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching favorite locations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add a favorite location
 * @route POST /api/users/favorites
 */
exports.addFavoriteLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, address, latitude, longitude } = req.body;
    
    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Name, address, latitude, and longitude are required'
      });
    }

    // In a real app, add the location to the database
    // For now, return a placeholder response
    res.status(201).json({
      success: true,
      message: 'Favorite location added successfully',
      data: {
        id: Date.now().toString(),
        name,
        address,
        latitude,
        longitude
      }
    });
  } catch (error) {
    console.error('Add favorite location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding favorite location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a favorite location
 * @route DELETE /api/users/favorites/:locationId
 */
exports.deleteFavoriteLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { locationId } = req.params;
    
    // In a real app, delete the location from the database
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Favorite location deleted successfully'
    });
  } catch (error) {
    console.error('Delete favorite location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting favorite location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
