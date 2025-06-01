/**
 * Fraud Controller for Taxi-Express
 * Handles fraud detection, prevention, and management
 */

const { FraudLog, FraudRule, User, Trip } = require('../models');
const { createAdminLog } = require('../services/admin.service');
const { Op } = require('sequelize');

/**
 * Get fraud logs
 * @route GET /api/fraud/logs
 */
exports.getFraudLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {};
    if (status) whereConditions.status = status;
    if (userId) whereConditions.userId = userId;
    
    if (startDate && endDate) {
      whereConditions.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get fraud logs with pagination
    const { count, rows: fraudLogs } = await FraudLog.findAndCountAll({
      where: whereConditions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        fraudLogs
      }
    });
  } catch (error) {
    console.error('Get fraud logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fraud logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get fraud log details
 * @route GET /api/fraud/logs/:logId
 */
exports.getFraudLogDetails = async (req, res) => {
  try {
    const { logId } = req.params;
    
    const fraudLog = await FraudLog.findByPk(logId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
        },
        {
          model: User,
          as: 'reviewedBy',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    if (!fraudLog) {
      return res.status(404).json({
        success: false,
        message: 'Fraud log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: fraudLog
    });
  } catch (error) {
    console.error('Get fraud log details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fraud log details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Review fraud log
 * @route PUT /api/fraud/logs/:logId/review
 */
exports.reviewFraudLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const { status, reviewNotes, actionTaken } = req.body;
    
    const fraudLog = await FraudLog.findByPk(logId);
    if (!fraudLog) {
      return res.status(404).json({
        success: false,
        message: 'Fraud log not found'
      });
    }

    // Update fraud log
    fraudLog.status = status;
    fraudLog.reviewNotes = reviewNotes;
    fraudLog.actionTaken = actionTaken;
    fraudLog.reviewedBy = req.user.id;
    fraudLog.reviewedAt = new Date();
    
    await fraudLog.save();

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'fraud_log_reviewed',
      targetType: 'fraud_log',
      targetId: fraudLog.id,
      details: `Reviewed fraud log ID ${fraudLog.id}, status: ${status}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Fraud log reviewed successfully',
      data: fraudLog
    });
  } catch (error) {
    console.error('Review fraud log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reviewing fraud log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user risk assessment
 * @route GET /api/fraud/users/:userId/risk
 */
exports.getUserRiskAssessment = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get fraud logs for the user
    const fraudLogs = await FraudLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    // Get recent trips
    const recentTrips = await Trip.findAll({
      where: { 
        [Op.or]: [
          { clientId: userId },
          { driverId: userId }
        ]
      },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    // Calculate risk score (simplified example)
    const confirmedFraudCount = fraudLogs.filter(log => log.status === 'confirmed').length;
    const suspiciousActivityCount = fraudLogs.filter(log => log.status === 'suspicious').length;
    
    const riskScore = (confirmedFraudCount * 25) + (suspiciousActivityCount * 10);
    const riskLevel = riskScore > 50 ? 'high' : (riskScore > 20 ? 'medium' : 'low');

    res.status(200).json({
      success: true,
      data: {
        userId,
        userDetails: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          role: user.role,
          accountCreated: user.createdAt,
          isBlocked: user.isBlocked
        },
        riskAssessment: {
          riskScore,
          riskLevel,
          confirmedFraudCount,
          suspiciousActivityCount,
          totalFraudLogs: fraudLogs.length
        },
        recentActivity: {
          fraudLogs: fraudLogs.slice(0, 5),
          recentTrips
        }
      }
    });
  } catch (error) {
    console.error('Get user risk assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user risk assessment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Block user
 * @route PUT /api/fraud/users/:userId/block
 */
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate block expiry if duration provided
    let blockExpiry = null;
    if (duration) {
      blockExpiry = new Date();
      blockExpiry.setDate(blockExpiry.getDate() + parseInt(duration));
    }

    // Update user
    user.isBlocked = true;
    user.blockReason = reason;
    user.blockExpiry = blockExpiry;
    user.blockedBy = req.user.id;
    user.blockedAt = new Date();
    
    await user.save();

    // Create fraud log
    await FraudLog.create({
      userId: user.id,
      type: 'account_blocked',
      details: reason,
      status: 'confirmed',
      severity: 'high',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      actionTaken: `Account blocked${duration ? ` for ${duration} days` : ' permanently'}`
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'user_blocked',
      targetType: 'user',
      targetId: user.id,
      details: `Blocked user: ${user.email}, Reason: ${reason}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      data: {
        userId: user.id,
        isBlocked: user.isBlocked,
        blockReason: user.blockReason,
        blockExpiry: user.blockExpiry
      }
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Unblock user
 * @route PUT /api/fraud/users/:userId/unblock
 */
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: 'User is not blocked'
      });
    }

    // Update user
    user.isBlocked = false;
    user.blockReason = null;
    user.blockExpiry = null;
    user.unblockedBy = req.user.id;
    user.unblockedAt = new Date();
    
    await user.save();

    // Create fraud log
    await FraudLog.create({
      userId: user.id,
      type: 'account_unblocked',
      details: notes || 'Account unblocked by admin',
      status: 'resolved',
      severity: 'low',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      actionTaken: 'Account unblocked'
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'user_unblocked',
      targetType: 'user',
      targetId: user.id,
      details: `Unblocked user: ${user.email}, Notes: ${notes || 'None'}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      data: {
        userId: user.id,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unblocking user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset fraud score
 * @route PUT /api/fraud/users/:userId/reset-score
 */
exports.resetFraudScore = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset fraud score (assuming there's a fraudScore field in the User model)
    user.fraudScore = 0;
    await user.save();

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'fraud_score_reset',
      targetType: 'user',
      targetId: user.id,
      details: `Reset fraud score for user: ${user.email}, Reason: ${reason || 'Not provided'}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Fraud score reset successfully',
      data: {
        userId: user.id,
        fraudScore: user.fraudScore
      }
    });
  } catch (error) {
    console.error('Reset fraud score error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting fraud score',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get fraud statistics
 * @route GET /api/fraud/statistics
 */
exports.getFraudStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Define date range
    const dateRange = {};
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get fraud logs count by status
    const totalLogs = await FraudLog.count({ where: dateRange });
    const confirmedFraud = await FraudLog.count({ 
      where: { ...dateRange, status: 'confirmed' } 
    });
    const suspiciousActivity = await FraudLog.count({ 
      where: { ...dateRange, status: 'suspicious' } 
    });
    const falsePositives = await FraudLog.count({ 
      where: { ...dateRange, status: 'false_positive' } 
    });

    // Get fraud logs count by type
    const paymentFraud = await FraudLog.count({ 
      where: { ...dateRange, type: { [Op.like]: '%payment%' } } 
    });
    const accountFraud = await FraudLog.count({ 
      where: { ...dateRange, type: { [Op.like]: '%account%' } } 
    });
    const tripFraud = await FraudLog.count({ 
      where: { ...dateRange, type: { [Op.like]: '%trip%' } } 
    });

    // Get blocked users count
    const blockedUsers = await User.count({ 
      where: { isBlocked: true } 
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalFraudLogs: totalLogs,
          confirmedFraud,
          suspiciousActivity,
          falsePositives,
          blockedUsers
        },
        byType: {
          paymentFraud,
          accountFraud,
          tripFraud,
          other: totalLogs - (paymentFraud + accountFraud + tripFraud)
        },
        percentages: {
          confirmedRate: totalLogs > 0 ? (confirmedFraud / totalLogs) * 100 : 0,
          falsePositiveRate: totalLogs > 0 ? (falsePositives / totalLogs) * 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Get fraud statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fraud statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create fraud rule
 * @route POST /api/fraud/rules
 */
exports.createFraudRule = async (req, res) => {
  try {
    const { name, description, conditions, actions, isActive = true } = req.body;
    
    // Validate required fields
    if (!name || !conditions || !actions) {
      return res.status(400).json({
        success: false,
        message: 'Name, conditions, and actions are required'
      });
    }

    // Create fraud rule
    const fraudRule = await FraudRule.create({
      name,
      description,
      conditions,
      actions,
      isActive,
      createdBy: req.user.id
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'fraud_rule_created',
      targetType: 'fraud_rule',
      targetId: fraudRule.id,
      details: `Created fraud rule: ${name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      message: 'Fraud rule created successfully',
      data: fraudRule
    });
  } catch (error) {
    console.error('Create fraud rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating fraud rule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get fraud rules
 * @route GET /api/fraud/rules
 */
exports.getFraudRules = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    // Build query conditions
    const whereConditions = {};
    if (isActive !== undefined) {
      whereConditions.isActive = isActive === 'true';
    }

    // Get fraud rules
    const fraudRules = await FraudRule.findAll({
      where: whereConditions,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: fraudRules
    });
  } catch (error) {
    console.error('Get fraud rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fraud rules',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update fraud rule
 * @route PUT /api/fraud/rules/:ruleId
 */
exports.updateFraudRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { name, description, conditions, actions, isActive } = req.body;
    
    // Find fraud rule
    const fraudRule = await FraudRule.findByPk(ruleId);
    if (!fraudRule) {
      return res.status(404).json({
        success: false,
        message: 'Fraud rule not found'
      });
    }

    // Update fields
    if (name) fraudRule.name = name;
    if (description !== undefined) fraudRule.description = description;
    if (conditions) fraudRule.conditions = conditions;
    if (actions) fraudRule.actions = actions;
    if (isActive !== undefined) fraudRule.isActive = isActive;
    
    fraudRule.updatedBy = req.user.id;
    fraudRule.updatedAt = new Date();
    
    await fraudRule.save();

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'fraud_rule_updated',
      targetType: 'fraud_rule',
      targetId: fraudRule.id,
      details: `Updated fraud rule: ${fraudRule.name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Fraud rule updated successfully',
      data: fraudRule
    });
  } catch (error) {
    console.error('Update fraud rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating fraud rule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete fraud rule
 * @route DELETE /api/fraud/rules/:ruleId
 */
exports.deleteFraudRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    // Find fraud rule
    const fraudRule = await FraudRule.findByPk(ruleId);
    if (!fraudRule) {
      return res.status(404).json({
        success: false,
        message: 'Fraud rule not found'
      });
    }

    // Store rule name for logging
    const ruleName = fraudRule.name;

    // Delete rule
    await fraudRule.destroy();

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'fraud_rule_deleted',
      targetType: 'fraud_rule',
      targetId: ruleId,
      details: `Deleted fraud rule: ${ruleName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Fraud rule deleted successfully'
    });
  } catch (error) {
    console.error('Delete fraud rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting fraud rule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Manual fraud check
 * @route POST /api/fraud/check
 */
exports.manualFraudCheck = async (req, res) => {
  try {
    const { userId, tripId, paymentId, checkType } = req.body;
    
    // Validate required fields
    if (!userId && !tripId && !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'At least one of userId, tripId, or paymentId is required'
      });
    }

    // Placeholder for fraud check results
    // In a real implementation, this would call fraud detection services
    const fraudCheckResults = {
      checkType: checkType || 'manual',
      timestamp: new Date(),
      requestedBy: req.user.id,
      results: {
        riskScore: Math.floor(Math.random() * 100),
        flags: [],
        recommendation: 'monitor'
      }
    };

    // Add some sample flags based on check type
    if (checkType === 'payment') {
      fraudCheckResults.results.flags.push(
        { type: 'payment_pattern', severity: 'low', description: 'Unusual payment pattern detected' }
      );
    } else if (checkType === 'account') {
      fraudCheckResults.results.flags.push(
        { type: 'location_mismatch', severity: 'medium', description: 'Account accessed from unusual location' }
      );
    } else if (checkType === 'trip') {
      fraudCheckResults.results.flags.push(
        { type: 'route_deviation', severity: 'low', description: 'Unusual route deviation detected' }
      );
    }

    // Set recommendation based on risk score
    if (fraudCheckResults.results.riskScore > 75) {
      fraudCheckResults.results.recommendation = 'block';
    } else if (fraudCheckResults.results.riskScore > 50) {
      fraudCheckResults.results.recommendation = 'investigate';
    }

    // Create fraud log if risk score is high enough
    if (fraudCheckResults.results.riskScore > 50) {
      await FraudLog.create({
        userId: userId || null,
        tripId: tripId || null,
        paymentId: paymentId || null,
        type: `manual_check_${checkType || 'general'}`,
        details: JSON.stringify(fraudCheckResults),
        status: 'suspicious',
        severity: fraudCheckResults.results.riskScore > 75 ? 'high' : 'medium',
        createdBy: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      data: fraudCheckResults
    });
  } catch (error) {
    console.error('Manual fraud check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing manual fraud check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
