/**
 * SMS Service for Taxi-Express
 * Handles SMS notifications to users and drivers
 */

const axios = require('axios');
const { User, SmsLog } = require('../models');

/**
 * Send an SMS to a user
 * @param {string} userId - ID of the user to send SMS to
 * @param {string} messageType - Type of message (e.g., 'trip_request', 'verification')
 * @param {Object} messageData - Data to include in the message
 * @returns {Promise<Object>} SMS sending result
 */
exports.sendSms = async (userId, messageType, messageData = {}) => {
  try {
    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Check if user has a phone number
    if (!user.phoneNumber) {
      return {
        success: false,
        message: 'User has no phone number'
      };
    }

    // Check if user has opted out of SMS
    if (user.notificationPreferences && 
        user.notificationPreferences.sms === false) {
      return {
        success: false,
        message: 'User has opted out of SMS notifications'
      };
    }

    // Get message template based on type and language
    const language = user.preferredLanguage || 'fr'; // Default to French
    const messageTemplate = getMessageTemplate(messageType, language);

    // Replace placeholders in template with actual data
    const messageText = formatMessage(messageTemplate, {
      firstName: user.firstName,
      lastName: user.lastName,
      ...messageData
    });

    // Send SMS via external provider
    const result = await sendSmsViaProvider(user.phoneNumber, messageText);

    // Log the SMS
    await SmsLog.create({
      userId,
      phoneNumber: user.phoneNumber,
      messageType,
      messageText,
      status: result.success ? 'sent' : 'failed',
      providerResponse: JSON.stringify(result),
      sentAt: new Date()
    });

    return {
      success: result.success,
      message: result.message,
      smsId: result.smsId
    };
  } catch (error) {
    console.error('SMS sending error:', error);
    
    // Log the error
    await SmsLog.create({
      userId,
      messageType,
      status: 'error',
      providerResponse: JSON.stringify({ error: error.message }),
      sentAt: new Date()
    });

    return {
      success: false,
      message: 'Error sending SMS',
      error: error.message
    };
  }
};

/**
 * Send a bulk SMS to multiple users
 * @param {Array<string>} userIds - IDs of users to send SMS to
 * @param {string} messageType - Type of message
 * @param {Object} messageData - Data to include in the message
 * @returns {Promise<Object>} Bulk SMS sending result
 */
exports.sendBulkSms = async (userIds, messageType, messageData = {}) => {
  try {
    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('Invalid or empty userIds array');
    }

    // Get users
    const users = await User.findAll({
      where: {
        id: userIds,
        phoneNumber: {
          [Op.ne]: null
        }
      }
    });

    if (users.length === 0) {
      return {
        success: false,
        message: 'No valid users found with phone numbers'
      };
    }

    // Filter users who have opted out of SMS
    const eligibleUsers = users.filter(user => 
      !(user.notificationPreferences && user.notificationPreferences.sms === false)
    );

    if (eligibleUsers.length === 0) {
      return {
        success: false,
        message: 'All users have opted out of SMS notifications'
      };
    }

    // Send SMS to each eligible user
    const results = await Promise.all(
      eligibleUsers.map(async (user) => {
        // Get message template based on type and language
        const language = user.preferredLanguage || 'fr'; // Default to French
        const messageTemplate = getMessageTemplate(messageType, language);

        // Replace placeholders in template with actual data
        const messageText = formatMessage(messageTemplate, {
          firstName: user.firstName,
          lastName: user.lastName,
          ...messageData
        });

        // Send SMS via external provider
        const result = await sendSmsViaProvider(user.phoneNumber, messageText);

        // Log the SMS
        await SmsLog.create({
          userId: user.id,
          phoneNumber: user.phoneNumber,
          messageType,
          messageText,
          status: result.success ? 'sent' : 'failed',
          providerResponse: JSON.stringify(result),
          sentAt: new Date()
        });

        return {
          userId: user.id,
          phoneNumber: user.phoneNumber,
          success: result.success,
          smsId: result.smsId
        };
      })
    );

    // Count successes and failures
    const successes = results.filter(r => r.success).length;
    const failures = results.length - successes;

    return {
      success: successes > 0,
      message: `Sent ${successes} SMS messages, ${failures} failures`,
      details: results
    };
  } catch (error) {
    console.error('Bulk SMS sending error:', error);
    return {
      success: false,
      message: 'Error sending bulk SMS',
      error: error.message
    };
  }
};

/**
 * Send SMS via external provider
 * @param {string} phoneNumber - Phone number to send SMS to
 * @param {string} messageText - Message text
 * @returns {Promise<Object>} Provider response
 */
async function sendSmsViaProvider(phoneNumber, messageText) {
  try {
    // In a production environment, this would integrate with an actual SMS provider
    // like Twilio, Nexmo, Africa's Talking, etc.
    
    // For now, we'll simulate a successful response
    
    // Uncomment and modify this code when integrating with a real provider
    /*
    const response = await axios.post(process.env.SMS_PROVIDER_URL, {
      apiKey: process.env.SMS_API_KEY,
      to: phoneNumber,
      message: messageText,
      from: process.env.SMS_SENDER_ID
    });
    
    return {
      success: response.data.status === 'success',
      message: response.data.message,
      smsId: response.data.id
    };
    */
    
    // Simulated response
    console.log(`[SMS SIMULATION] To: ${phoneNumber}, Message: ${messageText}`);
    
    return {
      success: true,
      message: 'SMS sent successfully (simulated)',
      smsId: `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };
  } catch (error) {
    console.error('SMS provider error:', error);
    return {
      success: false,
      message: 'Error from SMS provider',
      error: error.message
    };
  }
}

/**
 * Get message template based on type and language
 * @param {string} messageType - Type of message
 * @param {string} language - Language code (e.g., 'en', 'fr')
 * @returns {string} Message template
 */
function getMessageTemplate(messageType, language) {
  // Message templates in different languages
  const templates = {
    // Trip related messages
    trip_request: {
      en: 'Hello {{firstName}}, your taxi has been requested. We are finding a driver for you.',
      fr: 'Bonjour {{firstName}}, votre taxi a été demandé. Nous recherchons un chauffeur pour vous.'
    },
    trip_driver_assigned: {
      en: 'Hello {{firstName}}, your driver {{driverName}} ({{driverPhone}}) has been assigned to your trip. Vehicle: {{vehicleModel}} ({{vehiclePlate}})',
      fr: 'Bonjour {{firstName}}, votre chauffeur {{driverName}} ({{driverPhone}}) a été assigné à votre trajet. Véhicule: {{vehicleModel}} ({{vehiclePlate}})'
    },
    trip_driver_arrived: {
      en: 'Hello {{firstName}}, your driver has arrived at the pickup location.',
      fr: 'Bonjour {{firstName}}, votre chauffeur est arrivé au lieu de prise en charge.'
    },
    trip_started: {
      en: 'Hello {{firstName}}, your trip has started. Estimated arrival time: {{eta}} minutes.',
      fr: 'Bonjour {{firstName}}, votre trajet a commencé. Heure d\'arrivée estimée: {{eta}} minutes.'
    },
    trip_completed: {
      en: 'Hello {{firstName}}, your trip has been completed. Total fare: {{amount}} {{currency}}. Thank you for using Taxi-Express!',
      fr: 'Bonjour {{firstName}}, votre trajet est terminé. Montant total: {{amount}} {{currency}}. Merci d\'utiliser Taxi-Express!'
    },
    trip_cancelled: {
      en: 'Hello {{firstName}}, your trip has been cancelled. Reason: {{reason}}',
      fr: 'Bonjour {{firstName}}, votre trajet a été annulé. Raison: {{reason}}'
    },
    
    // Driver related messages
    driver_new_request: {
      en: 'Hello {{firstName}}, you have a new trip request from {{pickupLocation}} to {{dropoffLocation}}. Estimated fare: {{amount}} {{currency}}',
      fr: 'Bonjour {{firstName}}, vous avez une nouvelle demande de trajet de {{pickupLocation}} à {{dropoffLocation}}. Montant estimé: {{amount}} {{currency}}'
    },
    driver_trip_cancelled: {
      en: 'Hello {{firstName}}, the trip has been cancelled by the client. Reason: {{reason}}',
      fr: 'Bonjour {{firstName}}, le trajet a été annulé par le client. Raison: {{reason}}'
    },
    driver_verification_approved: {
      en: 'Hello {{firstName}}, your driver verification has been approved. You can now start accepting trips!',
      fr: 'Bonjour {{firstName}}, votre vérification de chauffeur a été approuvée. Vous pouvez maintenant commencer à accepter des trajets!'
    },
    driver_verification_rejected: {
      en: 'Hello {{firstName}}, your driver verification has been rejected. Reason: {{reason}}. Please update your information and try again.',
      fr: 'Bonjour {{firstName}}, votre vérification de chauffeur a été rejetée. Raison: {{reason}}. Veuillez mettre à jour vos informations et réessayer.'
    },
    driver_payment_processed: {
      en: 'Hello {{firstName}}, your payment of {{amount}} {{currency}} has been processed and will be transferred to your account.',
      fr: 'Bonjour {{firstName}}, votre paiement de {{amount}} {{currency}} a été traité et sera transféré sur votre compte.'
    },
    
    // Payment related messages
    payment_received: {
      en: 'Hello {{firstName}}, we have received your payment of {{amount}} {{currency}}. Your wallet has been updated.',
      fr: 'Bonjour {{firstName}}, nous avons reçu votre paiement de {{amount}} {{currency}}. Votre portefeuille a été mis à jour.'
    },
    payment_failed: {
      en: 'Hello {{firstName}}, your payment of {{amount}} {{currency}} has failed. Reason: {{reason}}. Please try again.',
      fr: 'Bonjour {{firstName}}, votre paiement de {{amount}} {{currency}} a échoué. Raison: {{reason}}. Veuillez réessayer.'
    },
    withdrawal_processed: {
      en: 'Hello {{firstName}}, your withdrawal of {{amount}} {{currency}} has been processed and will be transferred to your account.',
      fr: 'Bonjour {{firstName}}, votre retrait de {{amount}} {{currency}} a été traité et sera transféré sur votre compte.'
    },
    withdrawal_rejected: {
      en: 'Hello {{firstName}}, your withdrawal request of {{amount}} {{currency}} has been rejected. Reason: {{reason}}',
      fr: 'Bonjour {{firstName}}, votre demande de retrait de {{amount}} {{currency}} a été rejetée. Raison: {{reason}}'
    },
    
    // Account related messages
    account_verification: {
      en: 'Hello {{firstName}}, your verification code is {{code}}. It will expire in {{expiry}} minutes.',
      fr: 'Bonjour {{firstName}}, votre code de vérification est {{code}}. Il expirera dans {{expiry}} minutes.'
    },
    password_reset: {
      en: 'Hello {{firstName}}, your password reset code is {{code}}. It will expire in {{expiry}} minutes.',
      fr: 'Bonjour {{firstName}}, votre code de réinitialisation de mot de passe est {{code}}. Il expirera dans {{expiry}} minutes.'
    },
    account_created: {
      en: 'Hello {{firstName}}, welcome to Taxi-Express! Your account has been created successfully.',
      fr: 'Bonjour {{firstName}}, bienvenue sur Taxi-Express! Votre compte a été créé avec succès.'
    },
    account_updated: {
      en: 'Hello {{firstName}}, your account information has been updated successfully.',
      fr: 'Bonjour {{firstName}}, les informations de votre compte ont été mises à jour avec succès.'
    },
    
    // Promotional messages
    promotion: {
      en: 'Hello {{firstName}}, use code {{promoCode}} to get {{discount}} off your next trip! Valid until {{validUntil}}.',
      fr: 'Bonjour {{firstName}}, utilisez le code {{promoCode}} pour obtenir {{discount}} de réduction sur votre prochain trajet! Valable jusqu\'au {{validUntil}}.'
    }
  };
  
  // Get template for the specified message type and language
  const template = templates[messageType] && templates[messageType][language];
  
  // If template not found, use English or default message
  if (!template) {
    return templates[messageType]?.en || 'Hello {{firstName}}, you have a notification from Taxi-Express.';
  }
  
  return template;
}

/**
 * Format message by replacing placeholders with actual data
 * @param {string} template - Message template with placeholders
 * @param {Object} data - Data to replace placeholders with
 * @returns {string} Formatted message
 */
function formatMessage(template, data) {
  let message = template;
  
  // Replace each placeholder with its corresponding value
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    message = message.replace(placeholder, data[key] || '');
  });
  
  // Remove any remaining placeholders
  message = message.replace(/{{[^}]+}}/g, '');
  
  return message;
}

/**
 * Get SMS delivery statistics
 * @param {Date} startDate - Start date for statistics
 * @param {Date} endDate - End date for statistics
 * @returns {Promise<Object>} SMS delivery statistics
 */
exports.getSmsStatistics = async (startDate, endDate) => {
  try {
    // Get SMS logs in the date range
    const logs = await SmsLog.findAll({
      where: {
        sentAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'id',
        'userId',
        'phoneNumber',
        'messageType',
        'status',
        'sentAt'
      ]
    });

    // Calculate statistics
    const totalSent = logs.length;
    const successful = logs.filter(log => log.status === 'sent').length;
    const failed = logs.filter(log => log.status === 'failed').length;
    const errors = logs.filter(log => log.status === 'error').length;
    
    // Success rate
    const successRate = totalSent > 0 ? (successful / totalSent) * 100 : 0;
    
    // Group by message type
    const byMessageType = {};
    logs.forEach(log => {
      if (!byMessageType[log.messageType]) {
        byMessageType[log.messageType] = 0;
      }
      byMessageType[log.messageType]++;
    });
    
    // Group by day
    const byDay = {};
    logs.forEach(log => {
      const day = log.sentAt.toISOString().split('T')[0];
      if (!byDay[day]) {
        byDay[day] = 0;
      }
      byDay[day]++;
    });
    
    // Sort by day
    const sortedByDay = Object.entries(byDay)
      .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
      .reduce((obj, [day, count]) => {
        obj[day] = count;
        return obj;
      }, {});

    return {
      totalSent,
      successful,
      failed,
      errors,
      successRate: Math.round(successRate * 100) / 100,
      byMessageType,
      byDay: sortedByDay
    };
  } catch (error) {
    console.error('SMS statistics error:', error);
    throw error;
  }
};
