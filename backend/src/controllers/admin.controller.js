/**
 * Admin Controller for Taxi-Express
 * Handles core administrative functions
 */

const { User, Driver, Trip, Payment, Notification, FraudLog, AdminLog } = require('../models');
const { createAdminLog } = require('../services/admin.service');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('sequelize');

/**
 * Get dashboard statistics
 * @route GET /api/admin/dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    // Get date range (default: last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // User statistics
    const totalUsers = await User.count({
      where: { role: 'user' }
    });

    const newUsers = await User.count({
      where: {
        role: 'user',
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Driver statistics
    const totalDrivers = await Driver.count();
    
    const pendingVerifications = await Driver.count({
      where: { verificationStatus: 'pending' }
    });

    const activeDrivers = await Driver.count({
      where: { isAvailable: true, isVerified: true }
    });

    // Trip statistics
    const totalTrips = await Trip.count();
    
    const recentTrips = await Trip.count({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    const tripsByStatus = await Trip.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Payment statistics
    const totalRevenue = await Payment.sum('platformFee', {
      where: { status: 'completed' }
    });

    const recentRevenue = await Payment.sum('platformFee', {
      where: {
        status: 'completed',
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    const pendingPayments = await Payment.count({
      where: { status: 'pending' }
    });

    // Fraud statistics
    const pendingFraudReviews = await FraudLog.count({
      where: { status: 'pending' }
    });

    // Daily trip statistics for chart
    const dailyTrips = await Trip.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt'))],
      order: [[sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'ASC']]
    });

    // Daily revenue statistics for chart
    const dailyRevenue = await Payment.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('platformFee')), 'revenue']
      ],
      where: {
        status: 'completed',
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt'))],
      order: [[sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          new: newUsers
        },
        drivers: {
          total: totalDrivers,
          active: activeDrivers,
          pendingVerification: pendingVerifications
        },
        trips: {
          total: totalTrips,
          recent: recentTrips,
          byStatus: tripsByStatus
        },
        payments: {
          totalRevenue: totalRevenue || 0,
          recentRevenue: recentRevenue || 0,
          pendingPayments
        },
        fraud: {
          pendingReviews: pendingFraudReviews
        },
        charts: {
          dailyTrips,
          dailyRevenue
        }
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all users with filtering and pagination
 * @route GET /api/admin/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    const { 
      role, isActive, isVerified, isDriver, 
      search, sortBy = 'createdAt', sortOrder = 'DESC',
      page = 1, limit = 20 
    } = req.query;

    // Build query conditions
    const where = {};
    
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isDriver !== undefined) where.isDriver = isDriver === 'true';
    
    // Search by name, email, or phone
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phoneNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Get users with pagination
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: Driver,
          as: 'driver',
          required: false
        }
      ]
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'user_list_view',
      details: `Admin viewed user list with filters: ${JSON.stringify(req.query)}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user details by ID
 * @route GET /api/admin/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Driver,
          as: 'driver',
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's recent trips
    const recentTrips = await Trip.findAll({
      where: {
        [Op.or]: [
          { clientId: user.id },
          ...(user.isDriver ? [{ driverId: user.driver?.id }] : [])
        ]
      },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    // Get user's recent payments
    const recentPayments = await Payment.findAll({
      where: {
        [Op.or]: [
          { clientId: user.id },
          ...(user.isDriver ? [{ driverId: user.driver?.id }] : [])
        ]
      },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    // Get fraud logs if any
    const fraudLogs = await FraudLog.findAll({
      where: { userId: user.id },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'user_view',
      targetType: 'user',
      targetId: user.id,
      details: `Admin viewed user profile for ${user.firstName} ${user.lastName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        recentTrips,
        recentPayments,
        fraudLogs
      }
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user status (activate/deactivate)
 * @route PATCH /api/admin/users/:id/status
 */
exports.updateUserStatus = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    const { id } = req.params;
    const { isActive, reason } = req.body;
    
    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isActive status is required'
      });
    }

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deactivating yourself
    if (user.id === req.user.id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    // Store previous data for admin log
    const previousData = { isActive: user.isActive };

    // Update user status
    user.isActive = isActive;
    await user.save();

    // If user is a driver, update driver availability
    if (user.isDriver && !isActive) {
      const driver = await Driver.findOne({ where: { userId: user.id } });
      if (driver) {
        driver.isAvailable = false;
        await driver.save();
      }
    }

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: isActive ? 'user_activate' : 'user_deactivate',
      targetType: 'user',
      targetId: user.id,
      details: `Admin ${isActive ? 'activated' : 'deactivated'} user account. ${!isActive && reason ? `Reason: ${reason}` : ''}`,
      previousData,
      newData: { isActive: user.isActive },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Create notification for user
    await Notification.create({
      userId: user.id,
      type: 'account_update',
      title: `Account ${isActive ? 'Activated' : 'Deactivated'}`,
      message: isActive 
        ? 'Your account has been activated. You can now use all features of the application.' 
        : `Your account has been deactivated. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
      channel: 'app',
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user.id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset user password
 * @route POST /api/admin/users/:id/reset-password
 */
exports.resetUserPassword = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'user_password_reset',
      targetType: 'user',
      targetId: user.id,
      details: `Admin reset password for user ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Create notification for user
    await Notification.create({
      userId: user.id,
      type: 'account_update',
      title: 'Password Reset',
      message: 'Your password has been reset by an administrator. Please use the new password to log in.',
      channel: 'app',
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'User password reset successfully'
    });
  } catch (error) {
    console.error('Admin reset user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting user password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get pending driver verifications
 * @route GET /api/admin/drivers/pending-verification
 */
exports.getPendingDriverVerifications = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    const { page = 1, limit = 20 } = req.query;
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get pending verifications
    const { count, rows: drivers } = await Driver.findAndCountAll({
      where: { verificationStatus: 'pending' },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'ASC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'createdAt']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        drivers,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin get pending verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending driver verifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get admin logs
 * @route GET /api/admin/logs
 */
exports.getAdminLogs = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    const { 
      action, adminId, targetType, targetId,
      startDate, endDate,
      page = 1, limit = 20 
    } = req.query;
    
    // Build query conditions
    const where = {};
    
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    
    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      where.createdAt = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get admin logs with pagination
    const { count, rows: logs } = await AdminLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get fraud logs
 * @route GET /api/admin/fraud-logs
 */
exports.getFraudLogs = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    const { 
      type, status, userId, 
      minScore, maxScore,
      startDate, endDate,
      page = 1, limit = 20 
    } = req.query;
    
    // Build query conditions
    const where = {};
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;
    
    // Score range filter
    if (minScore || maxScore) {
      where.riskScore = {};
      if (minScore) where.riskScore[Op.gte] = parseFloat(minScore);
      if (maxScore) where.riskScore[Op.lte] = parseFloat(maxScore);
    }
    
    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      where.createdAt = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get fraud logs with pagination
    const { count, rows: logs } = await FraudLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        },
        {
          model: User,
          as: 'reviewedBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin get fraud logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fraud logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Review fraud log
 * @route PATCH /api/admin/fraud-logs/:id/review
 */
exports.reviewFraudLog = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    const { id } = req.params;
    const { status, reviewNotes, actionTaken } = req.body;
    
    if (!status || !['reviewed', 'dismissed', 'escalated'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status (reviewed, dismissed, escalated) is required'
      });
    }

    const fraudLog = await FraudLog.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'fraudScore']
        }
      ]
    });
    
    if (!fraudLog) {
      return res.status(404).json({
        success: false,
        message: 'Fraud log not found'
      });
    }

    // Store previous data for admin log
    const previousData = { ...fraudLog.toJSON() };

    // Update fraud log
    fraudLog.status = status;
    fraudLog.reviewedBy = req.user.id;
    fraudLog.reviewedAt = new Date();
    fraudLog.reviewNotes = reviewNotes;
    fraudLog.actionTaken = actionTaken;
    await fraudLog.save();

    // Update user fraud score if needed
    if (status === 'reviewed' && fraudLog.user) {
      const user = fraudLog.user;
      
      // Adjust fraud score based on risk score
      if (fraudLog.riskScore > 70) {
        user.fraudScore = Math.min(100, parseFloat(user.fraudScore) + 20);
      } else if (fraudLog.riskScore > 50) {
        user.fraudScore = Math.min(100, parseFloat(user.fraudScore) + 10);
      } else if (fraudLog.riskScore > 30) {
        user.fraudScore = Math.min(100, parseFloat(user.fraudScore) + 5);
      }
      
      await user.save();
    } else if (status === 'dismissed' && fraudLog.user) {
      // Slightly decrease fraud score for false positives
      const user = fraudLog.user;
      user.fraudScore = Math.max(0, parseFloat(user.fraudScore) - 2);
      await user.save();
    }

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'fraud_review',
      targetType: 'fraud_log',
      targetId: fraudLog.id,
      details: `Admin reviewed fraud log and marked it as ${status}. ${actionTaken ? `Action: ${actionTaken}` : ''}`,
      previousData,
      newData: fraudLog.toJSON(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Fraud log reviewed successfully',
      data: fraudLog
    });
  } catch (error) {
    console.error('Admin review fraud log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reviewing fraud log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
