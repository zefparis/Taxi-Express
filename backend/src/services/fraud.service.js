/**
 * Fraud Service for Taxi-Express
 * Handles fraud detection, risk assessment, and prevention
 */

const { FraudLog, User, Trip, Payment } = require('../models');
const { Op } = require('sequelize');

/**
 * Check for fraud risk and create a fraud log if necessary
 * @param {string} userId - ID of the user to check
 * @param {string} type - Type of potential fraud
 * @param {Object} data - Additional data about the potential fraud
 * @returns {Promise<Object>} Created fraud log if risk detected, null otherwise
 */
exports.checkFraudRisk = async (userId, type, data = {}) => {
  try {
    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Calculate risk score based on type and data
    let riskScore = 0;
    let details = '';

    switch (type) {
      case 'suspicious_location':
        riskScore = calculateLocationRisk(data);
        details = `Suspicious location change detected. Trip ID: ${data.tripId}`;
        break;
        
      case 'excessive_cancellations':
        riskScore = calculateCancellationRisk(data);
        details = `Excessive trip cancellations. Recent cancellations: ${data.recentCancellations}`;
        break;
        
      case 'payment_failure':
        riskScore = calculatePaymentRisk(data);
        details = `Payment failure. Method: ${data.paymentMethod}, Amount: ${data.amount}`;
        break;
        
      case 'unusual_wallet_activity':
        riskScore = calculateWalletRisk(data);
        details = `Unusual wallet activity. Recent deposits: ${data.recentDeposits}, Total amount: ${data.totalAmount}`;
        break;
        
      case 'account_takeover':
        riskScore = calculateAccountTakeoverRisk(data);
        details = `Possible account takeover attempt. Login from new location: ${data.location}`;
        break;
        
      case 'multiple_accounts':
        riskScore = calculateMultipleAccountsRisk(data);
        details = `Possible multiple accounts. Matching details: ${data.matchingDetails}`;
        break;
        
      case 'rating_manipulation':
        riskScore = calculateRatingRisk(data);
        details = `Possible rating manipulation. Pattern: ${data.pattern}`;
        break;
        
      default:
        riskScore = 30; // Default moderate risk
        details = `Unknown fraud type: ${type}`;
    }

    // Only create a fraud log if risk score is above threshold
    if (riskScore >= 30) {
      // Create fraud log
      const fraudLog = await FraudLog.create({
        userId,
        type,
        details,
        data: JSON.stringify(data),
        riskScore,
        status: 'pending'
      });

      // Update user's fraud score
      if (riskScore > 70) {
        // High risk - significant increase in fraud score
        user.fraudScore = Math.min(100, parseFloat(user.fraudScore) + 15);
      } else if (riskScore > 50) {
        // Medium risk - moderate increase in fraud score
        user.fraudScore = Math.min(100, parseFloat(user.fraudScore) + 5);
      } else {
        // Low risk - small increase in fraud score
        user.fraudScore = Math.min(100, parseFloat(user.fraudScore) + 2);
      }
      
      await user.save();

      // If fraud score is very high, take automatic action
      if (user.fraudScore > 80) {
        await handleHighRiskUser(user, fraudLog);
      }

      return fraudLog;
    }

    return null;
  } catch (error) {
    console.error('Fraud check error:', error);
    // Don't throw the error to prevent disrupting the main flow
    return null;
  }
};

/**
 * Calculate risk score for suspicious location changes
 * @param {Object} data - Location data
 * @returns {number} Risk score (0-100)
 */
function calculateLocationRisk(data) {
  // This would normally use more sophisticated algorithms
  // For example, checking the speed of location change, comparing with past patterns, etc.
  
  // Placeholder implementation
  let riskScore = 50; // Start with medium risk
  
  // If we have trip data, we can do more checks
  if (data.tripId) {
    // In a real implementation, we would:
    // 1. Get the trip's previous locations
    // 2. Calculate the speed and distance of the change
    // 3. Compare with expected values based on traffic, vehicle type, etc.
    // 4. Adjust risk score accordingly
  }
  
  return riskScore;
}

/**
 * Calculate risk score for excessive trip cancellations
 * @param {Object} data - Cancellation data
 * @returns {number} Risk score (0-100)
 */
function calculateCancellationRisk(data) {
  const { recentCancellations } = data;
  
  // Simple algorithm based on number of recent cancellations
  if (recentCancellations >= 10) {
    return 90; // Very high risk
  } else if (recentCancellations >= 7) {
    return 75; // High risk
  } else if (recentCancellations >= 5) {
    return 60; // Medium-high risk
  } else if (recentCancellations >= 3) {
    return 40; // Medium risk
  }
  
  return 20; // Low risk
}

/**
 * Calculate risk score for payment failures
 * @param {Object} data - Payment data
 * @returns {number} Risk score (0-100)
 */
function calculatePaymentRisk(data) {
  const { paymentMethod, amount, failureCount } = data;
  
  let riskScore = 30; // Start with low-medium risk
  
  // Higher amounts have higher risk
  if (amount > 1000) {
    riskScore += 30;
  } else if (amount > 500) {
    riskScore += 20;
  } else if (amount > 100) {
    riskScore += 10;
  }
  
  // Multiple failures increase risk
  if (failureCount >= 5) {
    riskScore += 40;
  } else if (failureCount >= 3) {
    riskScore += 25;
  } else if (failureCount >= 2) {
    riskScore += 15;
  }
  
  // Cap at 100
  return Math.min(100, riskScore);
}

/**
 * Calculate risk score for unusual wallet activity
 * @param {Object} data - Wallet activity data
 * @returns {number} Risk score (0-100)
 */
function calculateWalletRisk(data) {
  const { recentDeposits, totalAmount, currentDeposit } = data;
  
  let riskScore = 20; // Start with low risk
  
  // Many recent deposits are suspicious
  if (recentDeposits >= 10) {
    riskScore += 40;
  } else if (recentDeposits >= 5) {
    riskScore += 25;
  } else if (recentDeposits >= 3) {
    riskScore += 15;
  }
  
  // Large total amounts are suspicious
  if (totalAmount > 5000) {
    riskScore += 30;
  } else if (totalAmount > 2000) {
    riskScore += 20;
  } else if (totalAmount > 1000) {
    riskScore += 10;
  }
  
  // Large current deposit is suspicious
  if (currentDeposit > 1000) {
    riskScore += 20;
  } else if (currentDeposit > 500) {
    riskScore += 10;
  }
  
  // Cap at 100
  return Math.min(100, riskScore);
}

/**
 * Calculate risk score for account takeover attempts
 * @param {Object} data - Account activity data
 * @returns {number} Risk score (0-100)
 */
function calculateAccountTakeoverRisk(data) {
  const { location, deviceChange, ipChange, loginTime } = data;
  
  let riskScore = 40; // Start with medium risk
  
  // New location is suspicious
  if (location && location !== 'known') {
    riskScore += 20;
  }
  
  // Device change is suspicious
  if (deviceChange) {
    riskScore += 15;
  }
  
  // IP change is suspicious
  if (ipChange) {
    riskScore += 15;
  }
  
  // Unusual login time is suspicious
  if (loginTime === 'unusual') {
    riskScore += 10;
  }
  
  // Cap at 100
  return Math.min(100, riskScore);
}

/**
 * Calculate risk score for multiple account detection
 * @param {Object} data - Account data
 * @returns {number} Risk score (0-100)
 */
function calculateMultipleAccountsRisk(data) {
  const { matchingDetails, accountCount } = data;
  
  let riskScore = 50; // Start with medium risk
  
  // More matching details increase risk
  if (matchingDetails.includes('phone') && matchingDetails.includes('email')) {
    riskScore += 30;
  } else if (matchingDetails.includes('phone') || matchingDetails.includes('email')) {
    riskScore += 20;
  }
  
  // More accounts increase risk
  if (accountCount >= 5) {
    riskScore += 30;
  } else if (accountCount >= 3) {
    riskScore += 20;
  } else if (accountCount >= 2) {
    riskScore += 10;
  }
  
  // Cap at 100
  return Math.min(100, riskScore);
}

/**
 * Calculate risk score for rating manipulation
 * @param {Object} data - Rating data
 * @returns {number} Risk score (0-100)
 */
function calculateRatingRisk(data) {
  const { pattern, frequency } = data;
  
  let riskScore = 30; // Start with low-medium risk
  
  // Different patterns have different risks
  if (pattern === 'self_promotion') {
    riskScore += 30;
  } else if (pattern === 'competitor_downvote') {
    riskScore += 40;
  } else if (pattern === 'fake_accounts') {
    riskScore += 50;
  }
  
  // Higher frequency increases risk
  if (frequency === 'high') {
    riskScore += 30;
  } else if (frequency === 'medium') {
    riskScore += 20;
  } else if (frequency === 'low') {
    riskScore += 10;
  }
  
  // Cap at 100
  return Math.min(100, riskScore);
}

/**
 * Handle high-risk users automatically
 * @param {Object} user - User object
 * @param {Object} fraudLog - Fraud log object
 */
async function handleHighRiskUser(user, fraudLog) {
  try {
    // For very high risk users, we might want to:
    // 1. Temporarily suspend their account
    // 2. Require additional verification
    // 3. Limit certain features
    
    // This is a placeholder for more sophisticated handling
    if (user.fraudScore > 90) {
      // Extremely high risk - deactivate account
      user.isActive = false;
      await user.save();
      
      // Update fraud log
      fraudLog.actionTaken = 'account_deactivated';
      await fraudLog.save();
    } else if (user.fraudScore > 80) {
      // Very high risk - limit features
      user.restrictedFeatures = user.restrictedFeatures || [];
      
      if (!user.restrictedFeatures.includes('wallet')) {
        user.restrictedFeatures.push('wallet');
      }
      
      await user.save();
      
      // Update fraud log
      fraudLog.actionTaken = 'features_restricted';
      await fraudLog.save();
    }
  } catch (error) {
    console.error('Error handling high-risk user:', error);
  }
}

/**
 * Get fraud risk assessment for a user
 * @param {string} userId - ID of the user to assess
 * @returns {Promise<Object>} Risk assessment
 */
exports.getUserRiskAssessment = async (userId) => {
  try {
    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Get recent fraud logs
    const recentLogs = await FraudLog.findAll({
      where: {
        userId,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      },
      order: [['createdAt', 'DESC']]
    });

    // Count logs by type
    const logsByType = {};
    recentLogs.forEach(log => {
      if (!logsByType[log.type]) {
        logsByType[log.type] = 0;
      }
      logsByType[log.type]++;
    });

    // Get recent trips
    const recentTrips = await Trip.count({
      where: {
        [Op.or]: [
          { clientId: userId },
          { '$driver.userId$': userId }
        ],
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: [
        {
          model: User,
          as: 'driver',
          required: false
        }
      ]
    });

    // Get recent payments
    const recentPayments = await Payment.count({
      where: {
        [Op.or]: [
          { clientId: userId },
          { '$driver.userId$': userId }
        ],
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: [
        {
          model: User,
          as: 'driver',
          required: false
        }
      ]
    });

    // Calculate risk level
    let riskLevel = 'low';
    if (user.fraudScore > 70) {
      riskLevel = 'high';
    } else if (user.fraudScore > 40) {
      riskLevel = 'medium';
    }

    return {
      userId,
      fraudScore: user.fraudScore,
      riskLevel,
      recentFraudLogs: recentLogs.length,
      fraudLogsByType: logsByType,
      recentActivity: {
        trips: recentTrips,
        payments: recentPayments
      },
      restrictedFeatures: user.restrictedFeatures || [],
      lastAssessment: new Date()
    };
  } catch (error) {
    console.error('User risk assessment error:', error);
    throw error;
  }
};
