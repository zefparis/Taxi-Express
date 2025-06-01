/**
 * SMS Controller for Taxi-Express
 * Handles SMS, email, and push notifications
 */

const { User, SmsLog, NotificationTemplate } = require('../models');
const { createAdminLog } = require('../services/admin.service');
const { Op } = require('sequelize');

/**
 * Send SMS to a user
 * @route POST /api/sms/send
 */
exports.sendSms = async (req, res) => {
  try {
    const { userId, phoneNumber, message, type } = req.body;
    
    if ((!userId && !phoneNumber) || !message) {
      return res.status(400).json({
        success: false,
        message: 'Either userId or phoneNumber, and message are required'
      });
    }

    // If userId is provided, get the user's phone number
    let targetPhoneNumber = phoneNumber;
    if (userId && !phoneNumber) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      targetPhoneNumber = user.phoneNumber;
    }

    // In a real app, this would integrate with an SMS service like Twilio, Vonage, etc.
    // For now, we'll just log the SMS and return a success response
    
    // Log the SMS
    const smsLog = await SmsLog.create({
      phoneNumber: targetPhoneNumber,
      userId: userId || null,
      message,
      type: type || 'notification',
      status: 'sent',
      sentBy: req.user.id,
      sentAt: new Date()
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'sms_sent',
      targetType: 'user',
      targetId: userId || null,
      details: `SMS sent to ${targetPhoneNumber}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'SMS sent successfully',
      data: {
        id: smsLog.id,
        phoneNumber: targetPhoneNumber,
        status: 'sent',
        sentAt: smsLog.sentAt
      }
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send bulk SMS to multiple users
 * @route POST /api/sms/send-bulk
 */
exports.sendBulkSms = async (req, res) => {
  try {
    const { userIds, phoneNumbers, message, type } = req.body;
    
    if ((!userIds && !phoneNumbers) || !message) {
      return res.status(400).json({
        success: false,
        message: 'Either userIds or phoneNumbers, and message are required'
      });
    }

    // Process user IDs if provided
    let targetPhoneNumbers = phoneNumbers || [];
    if (userIds && userIds.length > 0) {
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'phoneNumber']
      });
      
      const userPhoneNumbers = users.map(user => user.phoneNumber).filter(Boolean);
      targetPhoneNumbers = [...new Set([...targetPhoneNumbers, ...userPhoneNumbers])];
    }

    if (targetPhoneNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid phone numbers found'
      });
    }

    // In a real app, this would batch send SMS via a service provider
    // For now, log each SMS and return a success response
    
    const smsLogs = [];
    for (const phoneNumber of targetPhoneNumbers) {
      const smsLog = await SmsLog.create({
        phoneNumber,
        userId: null, // We don't track individual users in bulk sends
        message,
        type: type || 'bulk',
        status: 'sent',
        sentBy: req.user.id,
        sentAt: new Date()
      });
      smsLogs.push(smsLog);
    }

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'bulk_sms_sent',
      targetType: 'multiple_users',
      targetId: null,
      details: `Bulk SMS sent to ${targetPhoneNumbers.length} recipients`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: `SMS sent successfully to ${targetPhoneNumbers.length} recipients`,
      data: {
        totalSent: targetPhoneNumbers.length,
        status: 'sent',
        sentAt: new Date()
      }
    });
  } catch (error) {
    console.error('Send bulk SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending bulk SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get SMS logs
 * @route GET /api/sms/logs
 */
exports.getSmsLogs = async (req, res) => {
  try {
    const { startDate, endDate, status, type, page = 1, limit = 20 } = req.query;
    
    // Build query conditions
    const whereConditions = {};
    
    if (status) {
      whereConditions.status = status;
    }
    
    if (type) {
      whereConditions.type = type;
    }
    
    if (startDate && endDate) {
      whereConditions.sentAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.sentAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.sentAt = {
        [Op.lte]: new Date(endDate)
      };
    }

    // Get SMS logs with pagination
    const { count, rows: smsLogs } = await SmsLog.findAndCountAll({
      where: whereConditions,
      order: [['sentAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: {
        logs: smsLogs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get SMS logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching SMS logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get SMS statistics
 * @route GET /api/sms/statistics
 */
exports.getSmsStatistics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(endDate);
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 1);
    }

    // Get total count
    const totalCount = await SmsLog.count({
      where: {
        sentAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Get count by status
    const countByStatus = await SmsLog.count({
      where: {
        sentAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['status']
    });

    // Get count by type
    const countByType = await SmsLog.count({
      where: {
        sentAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['type']
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        totalCount,
        byStatus: countByStatus,
        byType: countByType
      }
    });
  } catch (error) {
    console.error('Get SMS statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching SMS statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send verification SMS
 * @route POST /api/sms/verify
 */
exports.sendVerificationSms = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Generate a random 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // In a real app, store this code in the database with an expiration time
    // and send it via SMS service
    
    // For now, log the verification attempt
    await SmsLog.create({
      phoneNumber,
      userId: req.user.id,
      message: `Your verification code is: ${verificationCode}`,
      type: 'verification',
      status: 'sent',
      sentBy: null, // System-generated
      sentAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully',
      data: {
        phoneNumber,
        // Only include the code in development environment
        verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
      }
    });
  } catch (error) {
    console.error('Send verification SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending verification SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send push notification
 * @route POST /api/sms/push
 */
exports.sendPushNotification = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'UserId, title, and body are required'
      });
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // In a real app, this would integrate with FCM, APNS, etc.
    // For now, just log the notification and return success
    
    // Log the notification
    await SmsLog.create({
      userId,
      message: JSON.stringify({ title, body, data }),
      type: 'push',
      status: 'sent',
      sentBy: req.user.id,
      sentAt: new Date()
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'push_notification_sent',
      targetType: 'user',
      targetId: userId,
      details: `Push notification sent to user: ${title}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Push notification sent successfully',
      data: {
        userId,
        title,
        sentAt: new Date()
      }
    });
  } catch (error) {
    console.error('Send push notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending push notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send bulk push notifications
 * @route POST /api/sms/push-bulk
 */
exports.sendBulkPushNotification = async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;
    
    if (!userIds || !userIds.length || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'UserIds array, title, and body are required'
      });
    }

    // Find users
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id']
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid users found'
      });
    }

    // In a real app, this would batch send via FCM, APNS, etc.
    // For now, log each notification and return success
    
    for (const user of users) {
      await SmsLog.create({
        userId: user.id,
        message: JSON.stringify({ title, body, data }),
        type: 'push_bulk',
        status: 'sent',
        sentBy: req.user.id,
        sentAt: new Date()
      });
    }

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'bulk_push_notification_sent',
      targetType: 'multiple_users',
      targetId: null,
      details: `Bulk push notification sent to ${users.length} users: ${title}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: `Push notifications sent successfully to ${users.length} users`,
      data: {
        totalSent: users.length,
        title,
        sentAt: new Date()
      }
    });
  } catch (error) {
    console.error('Send bulk push notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending bulk push notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send email
 * @route POST /api/sms/email
 */
exports.sendEmail = async (req, res) => {
  try {
    const { userId, email, subject, message, template, templateData } = req.body;
    
    if ((!userId && !email) || !subject || (!message && !template)) {
      return res.status(400).json({
        success: false,
        message: 'Either userId or email, subject, and either message or template are required'
      });
    }

    // If userId is provided, get the user's email
    let targetEmail = email;
    if (userId && !email) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      targetEmail = user.email;
    }

    // In a real app, this would integrate with an email service
    // For now, just log the email and return success
    
    // Log the email
    await SmsLog.create({
      userId: userId || null,
      message: JSON.stringify({ 
        email: targetEmail, 
        subject, 
        message, 
        template, 
        templateData 
      }),
      type: 'email',
      status: 'sent',
      sentBy: req.user.id,
      sentAt: new Date()
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'email_sent',
      targetType: 'user',
      targetId: userId || null,
      details: `Email sent to ${targetEmail}: ${subject}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: {
        email: targetEmail,
        subject,
        sentAt: new Date()
      }
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send bulk emails
 * @route POST /api/sms/email-bulk
 */
exports.sendBulkEmail = async (req, res) => {
  try {
    const { userIds, emails, subject, message, template, templateData } = req.body;
    
    if ((!userIds && !emails) || !subject || (!message && !template)) {
      return res.status(400).json({
        success: false,
        message: 'Either userIds or emails, subject, and either message or template are required'
      });
    }

    // Process user IDs if provided
    let targetEmails = emails || [];
    if (userIds && userIds.length > 0) {
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'email']
      });
      
      const userEmails = users.map(user => user.email).filter(Boolean);
      targetEmails = [...new Set([...targetEmails, ...userEmails])];
    }

    if (targetEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid email addresses found'
      });
    }

    // In a real app, this would batch send emails via a service
    // For now, log each email and return success
    
    for (const email of targetEmails) {
      await SmsLog.create({
        message: JSON.stringify({ 
          email, 
          subject, 
          message, 
          template, 
          templateData 
        }),
        type: 'email_bulk',
        status: 'sent',
        sentBy: req.user.id,
        sentAt: new Date()
      });
    }

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'bulk_email_sent',
      targetType: 'multiple_users',
      targetId: null,
      details: `Bulk email sent to ${targetEmails.length} recipients: ${subject}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: `Emails sent successfully to ${targetEmails.length} recipients`,
      data: {
        totalSent: targetEmails.length,
        subject,
        sentAt: new Date()
      }
    });
  } catch (error) {
    console.error('Send bulk email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending bulk emails',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get notification templates
 * @route GET /api/sms/templates
 */
exports.getNotificationTemplates = async (req, res) => {
  try {
    const { type } = req.query;
    
    // Build query conditions
    const whereConditions = {};
    if (type) {
      whereConditions.type = type;
    }

    // Get templates
    const templates = await NotificationTemplate.findAll({
      where: whereConditions,
      order: [['type', 'ASC'], ['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get notification templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification templates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update notification template
 * @route PUT /api/sms/templates/:templateId
 */
exports.updateNotificationTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, subject, content, variables } = req.body;
    
    // Find template
    const template = await NotificationTemplate.findByPk(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Update template
    if (name) template.name = name;
    if (subject) template.subject = subject;
    if (content) template.content = content;
    if (variables) template.variables = variables;
    
    template.updatedBy = req.user.id;
    template.updatedAt = new Date();
    
    await template.save();

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'template_updated',
      targetType: 'notification_template',
      targetId: template.id,
      details: `Notification template updated: ${template.name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Update notification template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Test notification
 * @route POST /api/sms/test
 */
exports.testNotification = async (req, res) => {
  try {
    const { type, recipient, subject, message, template, templateData } = req.body;
    
    if (!type || !recipient || (!message && !template)) {
      return res.status(400).json({
        success: false,
        message: 'Type, recipient, and either message or template are required'
      });
    }

    // Validate type
    const validTypes = ['sms', 'email', 'push'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // In a real app, this would send a test notification via the appropriate service
    // For now, log the test and return success
    
    // Log the test
    await SmsLog.create({
      message: JSON.stringify({ 
        type,
        recipient,
        subject,
        message,
        template,
        templateData
      }),
      type: `test_${type}`,
      status: 'sent',
      sentBy: req.user.id,
      sentAt: new Date()
    });

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: 'test_notification_sent',
      targetType: 'system',
      targetId: null,
      details: `Test ${type} notification sent to ${recipient}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: `Test ${type} notification sent successfully`,
      data: {
        type,
        recipient,
        sentAt: new Date()
      }
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
