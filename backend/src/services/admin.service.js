/**
 * Admin Service for Taxi-Express
 * Handles administrative functions and logging
 */

const { AdminLog } = require('../models');

/**
 * Create an admin log entry
 * @param {Object} logData - Log data
 * @param {string} logData.adminId - ID of the admin performing the action
 * @param {string} logData.action - Type of action performed
 * @param {string} [logData.targetType] - Type of target (user, driver, trip, etc.)
 * @param {string} [logData.targetId] - ID of the target
 * @param {string} logData.details - Details of the action
 * @param {Object} [logData.previousData] - Previous state of the target
 * @param {Object} [logData.newData] - New state of the target
 * @param {string} [logData.ipAddress] - IP address of the admin
 * @param {string} [logData.userAgent] - User agent of the admin
 * @returns {Promise<Object>} Created log entry
 */
exports.createAdminLog = async (logData) => {
  try {
    const {
      adminId,
      action,
      targetType,
      targetId,
      details,
      previousData,
      newData,
      ipAddress,
      userAgent
    } = logData;

    // Validate required fields
    if (!adminId || !action || !details) {
      throw new Error('Missing required fields for admin log');
    }

    // Create log entry
    const log = await AdminLog.create({
      adminId,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      details,
      previousData: previousData ? JSON.stringify(previousData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    });

    return log;
  } catch (error) {
    console.error('Admin log creation error:', error);
    // Don't throw the error to prevent disrupting the main flow
    // Just log it and return null
    return null;
  }
};

/**
 * Get admin activity summary
 * @param {string} adminId - ID of the admin
 * @param {Date} startDate - Start date for the summary
 * @param {Date} endDate - End date for the summary
 * @returns {Promise<Object>} Activity summary
 */
exports.getAdminActivitySummary = async (adminId, startDate, endDate) => {
  try {
    const logs = await AdminLog.findAll({
      where: {
        adminId,
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Group logs by action type
    const actionCounts = {};
    logs.forEach(log => {
      if (!actionCounts[log.action]) {
        actionCounts[log.action] = 0;
      }
      actionCounts[log.action]++;
    });

    // Group logs by target type
    const targetCounts = {};
    logs.forEach(log => {
      if (log.targetType) {
        if (!targetCounts[log.targetType]) {
          targetCounts[log.targetType] = 0;
        }
        targetCounts[log.targetType]++;
      }
    });

    return {
      totalActions: logs.length,
      actionCounts,
      targetCounts,
      firstAction: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
      lastAction: logs.length > 0 ? logs[0].createdAt : null
    };
  } catch (error) {
    console.error('Admin activity summary error:', error);
    throw error;
  }
};

/**
 * Check if an admin has permission for a specific action
 * This is a placeholder for a more complex permission system
 * @param {string} adminId - ID of the admin
 * @param {string} action - Action to check permission for
 * @returns {Promise<boolean>} Whether the admin has permission
 */
exports.checkAdminPermission = async (adminId, action) => {
  try {
    // In a real implementation, this would check against a permissions database
    // For now, all admins have all permissions
    return true;
  } catch (error) {
    console.error('Admin permission check error:', error);
    return false;
  }
};

/**
 * Get system health metrics
 * @returns {Promise<Object>} System health metrics
 */
exports.getSystemHealth = async () => {
  try {
    // This is a placeholder for actual system health metrics
    // In a real implementation, this would check database connections,
    // API response times, server load, etc.
    
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date()
    };
  } catch (error) {
    console.error('System health check error:', error);
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date()
    };
  }
};
