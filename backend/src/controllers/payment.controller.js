/**
 * Payment Controller for Taxi-Express
 * Handles payment processing, wallet operations, and transaction management
 */

const { Payment, User, Trip, Driver, Notification } = require('../models');
const { createAdminLog } = require('../services/admin.service');
const { checkFraudRisk } = require('../services/fraud.service');
const { sendSMS } = require('../services/sms.service');
const { Op } = require('sequelize');
const { io } = require('../server');

/**
 * Process a payment for a trip
 * @route POST /api/payments/process
 */
exports.processPayment = async (req, res) => {
  try {
    const { tripId, paymentMethod, transactionReference } = req.body;
    
    if (!tripId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID and payment method are required'
      });
    }

    // Find the trip
    const trip = await Trip.findByPk(tripId, {
      include: [
        { model: User, as: 'tripClient' },
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ model: User, as: 'userAccount' }]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user is authorized to process this payment
    if (req.user.role !== 'admin' && req.user.id !== trip.clientId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process this payment'
      });
    }

    // Check if trip is completed
    if (trip.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment can only be processed for completed trips'
      });
    }

    // Check if payment already exists
    let payment = await Payment.findOne({
      where: { tripId }
    });

    if (!payment) {
      // Create new payment record
      const platformFee = parseFloat(trip.finalPrice) * 0.2; // 20% platform fee
      const driverAmount = parseFloat(trip.finalPrice) - platformFee;
      
      payment = await Payment.create({
        tripId: trip.id,
        clientId: trip.clientId,
        driverId: trip.driverId,
        amount: trip.finalPrice,
        platformFee,
        driverAmount,
        paymentMethod,
        status: 'pending',
        transactionReference,
        paymentInitiatedAt: new Date()
      });
    } else if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been processed for this trip'
      });
    } else {
      // Update existing payment record
      payment.paymentMethod = paymentMethod;
      payment.transactionReference = transactionReference;
      payment.status = 'pending';
      payment.paymentInitiatedAt = new Date();
      await payment.save();
    }

    // Process payment based on method
    switch (paymentMethod) {
      case 'cash':
        // Mark as completed immediately for cash payments
        payment.status = 'completed';
        payment.paymentCompletedAt = new Date();
        await payment.save();
        break;
        
      case 'wallet':
        // Check wallet balance
        const client = await User.findByPk(trip.clientId);
        
        if (parseFloat(client.walletBalance) < parseFloat(trip.finalPrice)) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient wallet balance'
          });
        }
        
        // Process wallet payment
        client.walletBalance = parseFloat(client.walletBalance) - parseFloat(trip.finalPrice);
        await client.save();
        
        // Add to driver wallet
        if (trip.driver && trip.driver.user) {
          const driver = trip.driver.user;
          driver.walletBalance = parseFloat(driver.walletBalance) + parseFloat(payment.driverAmount);
          await driver.save();
        }
        
        // Update payment status
        payment.status = 'completed';
        payment.paymentCompletedAt = new Date();
        await payment.save();
        break;
        
      case 'mobile_money':
      case 'card':
        // For mobile money and card payments, we would integrate with payment gateway
        // This is a placeholder for the actual implementation
        
        // In a real implementation, we would:
        // 1. Call the payment gateway API
        // 2. Process the payment
        // 3. Update the payment status based on the response
        
        // For demo purposes, we'll simulate a successful payment
        payment.status = 'completed';
        payment.paymentCompletedAt = new Date();
        await payment.save();
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment method'
        });
    }

    // Create notifications
    await Notification.create({
      userId: trip.clientId,
      type: 'payment_processed',
      title: 'Payment Processed',
      message: `Your payment of ${payment.amount} for the trip has been processed successfully.`,
      data: { tripId: trip.id, paymentId: payment.id },
      channel: 'app',
      priority: 'medium'
    });

    if (trip.driver && trip.driver.user) {
      await Notification.create({
        userId: trip.driver.user.id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `You've received ${payment.driverAmount} for your trip.`,
        data: { tripId: trip.id, paymentId: payment.id },
        channel: 'app',
        priority: 'medium'
      });
    }

    // Emit socket events
    io.to(`client_${trip.clientId}`).emit('payment_processed', {
      tripId: trip.id,
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount
    });

    if (trip.driver && trip.driver.user) {
      io.to(`driver_${trip.driver.user.id}`).emit('payment_received', {
        tripId: trip.id,
        paymentId: payment.id,
        status: payment.status,
        amount: payment.driverAmount
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment: {
          id: payment.id,
          tripId: payment.tripId,
          amount: payment.amount,
          driverAmount: payment.driverAmount,
          platformFee: payment.platformFee,
          status: payment.status,
          method: payment.paymentMethod,
          completedAt: payment.paymentCompletedAt
        }
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add funds to wallet
 * @route POST /api/payments/wallet/add
 */
exports.addToWallet = async (req, res) => {
  try {
    const { amount, paymentMethod, transactionReference } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    // Get user
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create wallet transaction
    const walletTransaction = await Payment.create({
      clientId: user.id,
      amount,
      paymentMethod,
      transactionReference,
      transactionType: 'wallet_deposit',
      status: 'pending',
      paymentInitiatedAt: new Date()
    });

    // Process payment based on method
    switch (paymentMethod) {
      case 'mobile_money':
      case 'card':
        // For mobile money and card payments, we would integrate with payment gateway
        // This is a placeholder for the actual implementation
        
        // In a real implementation, we would:
        // 1. Call the payment gateway API
        // 2. Process the payment
        // 3. Update the transaction status based on the response
        
        // For demo purposes, we'll simulate a successful payment
        walletTransaction.status = 'completed';
        walletTransaction.paymentCompletedAt = new Date();
        await walletTransaction.save();
        
        // Update user wallet balance
        user.walletBalance = parseFloat(user.walletBalance) + parseFloat(amount);
        await user.save();
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment method for wallet deposit'
        });
    }

    // Create notification
    await Notification.create({
      userId: user.id,
      type: 'wallet_update',
      title: 'Wallet Deposit',
      message: `${amount} has been added to your wallet.`,
      data: { paymentId: walletTransaction.id },
      channel: 'app',
      priority: 'medium'
    });

    // Check for potential fraud (unusual deposit patterns)
    const recentDeposits = await Payment.findAll({
      where: {
        clientId: user.id,
        transactionType: 'wallet_deposit',
        status: 'completed',
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    const totalRecentDeposits = recentDeposits.reduce((sum, deposit) => sum + parseFloat(deposit.amount), 0);
    
    if (recentDeposits.length >= 5 || totalRecentDeposits > 1000) {
      await checkFraudRisk(user.id, 'unusual_wallet_activity', {
        recentDeposits: recentDeposits.length,
        totalAmount: totalRecentDeposits,
        currentDeposit: amount
      });
    }

    res.status(200).json({
      success: true,
      message: 'Funds added to wallet successfully',
      data: {
        transaction: {
          id: walletTransaction.id,
          amount: walletTransaction.amount,
          status: walletTransaction.status,
          method: walletTransaction.paymentMethod,
          completedAt: walletTransaction.paymentCompletedAt
        },
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    console.error('Add to wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding funds to wallet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Withdraw funds from wallet (driver only)
 * @route POST /api/payments/wallet/withdraw
 */
exports.withdrawFromWallet = async (req, res) => {
  try {
    const { amount, bankAccount, bankName } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!bankAccount || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Bank account and bank name are required'
      });
    }

    // Get user
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is a driver
    const driver = await Driver.findOne({
      where: { userId: user.id }
    });

    if (!driver) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can withdraw funds'
      });
    }

    // Check wallet balance
    if (parseFloat(user.walletBalance) < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Create withdrawal transaction
    const withdrawalTransaction = await Payment.create({
      driverId: driver.id,
      amount,
      transactionType: 'wallet_withdrawal',
      status: 'pending',
      paymentInitiatedAt: new Date(),
      paymentDetails: JSON.stringify({
        bankName,
        bankAccount,
        requestedAt: new Date()
      })
    });

    // In a real implementation, we would:
    // 1. Initiate a bank transfer
    // 2. Update the transaction status based on the response
    
    // For demo purposes, we'll simulate a pending withdrawal
    // that will be processed by an admin
    
    // Deduct from user wallet balance
    user.walletBalance = parseFloat(user.walletBalance) - parseFloat(amount);
    await user.save();

    // Create notification for user
    await Notification.create({
      userId: user.id,
      type: 'wallet_update',
      title: 'Withdrawal Initiated',
      message: `Your withdrawal request for ${amount} has been initiated and is being processed.`,
      data: { paymentId: withdrawalTransaction.id },
      channel: 'app',
      priority: 'medium'
    });

    // Create notifications for admins
    const admins = await User.findAll({
      where: { role: 'admin', isActive: true }
    });

    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        type: 'system_alert',
        title: 'Withdrawal Request',
        message: `Driver ${driver.id} has requested a withdrawal of ${amount} to ${bankName}.`,
        data: { paymentId: withdrawalTransaction.id, driverId: driver.id },
        channel: 'app',
        priority: 'medium'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        transaction: {
          id: withdrawalTransaction.id,
          amount: withdrawalTransaction.amount,
          status: withdrawalTransaction.status,
          initiatedAt: withdrawalTransaction.paymentInitiatedAt
        },
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    console.error('Withdraw from wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing withdrawal request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Process withdrawal (admin only)
 * @route PATCH /api/payments/:id/process-withdrawal
 */
exports.processWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!status || !['completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status (completed or rejected) is required'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can process withdrawals'
      });
    }

    // Find the withdrawal transaction
    const withdrawal = await Payment.findByPk(id, {
      include: [
        { 
          model: Driver, 
          as: 'tripDriver',
          include: [{ model: User, as: 'userAccount' }]
        }
      ]
    });

    if (!withdrawal || withdrawal.transactionType !== 'wallet_withdrawal') {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal transaction not found'
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal has already been ${withdrawal.status}`
      });
    }

    // Store previous data for admin log
    const previousData = { ...withdrawal.toJSON() };

    // Update withdrawal status
    withdrawal.status = status;
    withdrawal.paymentCompletedAt = status === 'completed' ? new Date() : null;
    
    // Update payment details
    const paymentDetails = JSON.parse(withdrawal.paymentDetails || '{}');
    paymentDetails.processedAt = new Date();
    paymentDetails.processedBy = req.user.id;
    paymentDetails.notes = notes;
    withdrawal.paymentDetails = JSON.stringify(paymentDetails);
    
    await withdrawal.save();

    // If rejected, refund the amount to the driver's wallet
    if (status === 'rejected' && withdrawal.driver && withdrawal.driver.user) {
      const driver = withdrawal.driver.user;
      driver.walletBalance = parseFloat(driver.walletBalance) + parseFloat(withdrawal.amount);
      await driver.save();
    }

    // Create notification for driver
    if (withdrawal.driver && withdrawal.driver.user) {
      await Notification.create({
        userId: withdrawal.driver.user.id,
        type: 'wallet_update',
        title: status === 'completed' ? 'Withdrawal Completed' : 'Withdrawal Rejected',
        message: status === 'completed' 
          ? `Your withdrawal of ${withdrawal.amount} has been processed successfully.` 
          : `Your withdrawal of ${withdrawal.amount} has been rejected. Reason: ${notes || 'Not specified'}. The amount has been refunded to your wallet.`,
        data: { paymentId: withdrawal.id },
        channel: 'app',
        priority: 'high'
      });

      // Send SMS notification
      await sendSMS(
        withdrawal.driver.user.phoneNumber,
        status === 'completed' 
          ? `Votre retrait de ${withdrawal.amount} a été traité avec succès.` 
          : `Votre retrait de ${withdrawal.amount} a été rejeté. Raison: ${notes || 'Non spécifiée'}. Le montant a été remboursé sur votre portefeuille.`,
        withdrawal.driver.user.preferredLanguage || 'fr'
      );
    }

    // Create admin log
    await createAdminLog({
      adminId: req.user.id,
      action: status === 'completed' ? 'withdrawal_approve' : 'withdrawal_reject',
      targetType: 'payment',
      targetId: withdrawal.id,
      details: `Admin ${status === 'completed' ? 'approved' : 'rejected'} withdrawal. ${notes ? `Notes: ${notes}` : ''}`,
      previousData,
      newData: withdrawal.toJSON(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: `Withdrawal ${status === 'completed' ? 'processed' : 'rejected'} successfully`,
      data: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        processedAt: withdrawal.paymentCompletedAt
      }
    });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing withdrawal',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get payment history
 * @route GET /api/payments/history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { type, status, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    // Build query conditions
    const where = {};
    
    // Filter by user role
    if (req.user.role === 'admin') {
      // Admins can see all payments
    } else {
      // Regular users can only see their own payments
      const driver = await Driver.findOne({
        where: { userId: req.user.id }
      });
      
      if (driver) {
        where[Op.or] = [
          { clientId: req.user.id },
          { driverId: driver.id }
        ];
      } else {
        where.clientId = req.user.id;
      }
    }
    
    // Filter by transaction type
    if (type) {
      where.transactionType = type;
    }
    
    // Filter by status
    if (status) {
      where.status = status;
    }
    
    // Filter by date range
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
          attributes: ['id', 'pickupAddress', 'destinationAddress', 'status']
        },
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Driver,
          as: 'tripDriver',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
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
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get payment details
 * @route GET /api/payments/:id
 */
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'pickupAddress', 'destinationAddress', 'status', 'startTime', 'endTime']
        },
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
        },
        {
          model: Driver,
          as: 'tripDriver',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
            }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user has permission to view this payment
    if (req.user.role !== 'admin' && 
        payment.clientId !== req.user.id && 
        (!payment.driver || payment.driver.userId !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get payment details
 * @route GET /api/payments/:paymentId
 */
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'pickupAddress', 'destinationAddress', 'status', 'startTime', 'endTime']
        },
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
        },
        {
          model: Driver,
          as: 'tripDriver',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
            }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user has permission to view this payment
    if (req.user.role !== 'admin' && 
        payment.clientId !== req.user.id && 
        (!payment.driver || payment.driver.userId !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add funds to wallet
 * @route POST /api/payments/wallet/add
 */
exports.addFundsToWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod, transactionReference } = req.body;
    
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

    // Create a payment record for the wallet top-up
    await Payment.create({
      clientId: userId,
      amount,
      paymentMethod,
      transactionReference,
      status: 'completed',
      transactionType: 'wallet_topup',
      paymentInitiatedAt: new Date(),
      paymentCompletedAt: new Date()
    });

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
    console.error('Add funds to wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding funds to wallet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Withdraw funds from wallet
 * @route POST /api/payments/wallet/withdraw
 */
exports.withdrawFunds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bankAccount, mobileMoneyNumber } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Check if user is a driver
    const driver = await Driver.findOne({
      where: { userId },
      include: [{ model: User, as: 'user' }]
    });

    if (!driver) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can withdraw funds'
      });
    }

    if (parseFloat(driver.user.walletBalance) < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Create withdrawal request
    const withdrawal = await Payment.create({
      driverId: driver.id,
      clientId: userId,
      amount,
      status: 'pending',
      transactionType: 'withdrawal',
      paymentMethod: mobileMoneyNumber ? 'mobile_money' : 'bank_transfer',
      additionalData: JSON.stringify({
        bankAccount,
        mobileMoneyNumber
      }),
      paymentInitiatedAt: new Date()
    });

    // Notify admins about the withdrawal request
    const admins = await User.findAll({
      where: { role: 'admin', isActive: true }
    });

    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        type: 'system_alert',
        title: 'Withdrawal Request',
        message: `Driver ${driver.id} has requested a withdrawal of ${amount} XOF.`,
        channel: 'app',
        priority: 'medium'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        withdrawalId: withdrawal.id,
        amount,
        status: 'pending',
        requestDate: withdrawal.createdAt
      }
    });
  } catch (error) {
    console.error('Withdraw funds error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing withdrawal request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Initialize mobile money payment
 * @route POST /api/payments/mobile-money/initialize
 */
exports.initializeMobileMoneyPayment = async (req, res) => {
  try {
    const { amount, phoneNumber, provider, tripId } = req.body;
    
    if (!amount || !phoneNumber || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Amount, phone number, and provider are required'
      });
    }

    // In a real app, integrate with mobile money provider API
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Mobile money payment initiated',
      data: {
        transactionId: Date.now().toString(),
        amount,
        provider,
        status: 'pending',
        instructions: 'Please check your phone for payment confirmation'
      }
    });
  } catch (error) {
    console.error('Initialize mobile money payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating mobile money payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mobile money payment callback
 * @route POST /api/payments/mobile-money/callback
 */
exports.mobileMoneyCallback = async (req, res) => {
  try {
    const { transactionId, status, phoneNumber } = req.body;
    
    // In a real app, verify the callback with the mobile money provider
    // and update the payment status accordingly
    
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Mobile money callback processed'
    });
  } catch (error) {
    console.error('Mobile money callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing mobile money callback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Initialize card payment
 * @route POST /api/payments/card/initialize
 */
exports.initializeCardPayment = async (req, res) => {
  try {
    const { amount, cardToken, tripId } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    // In a real app, integrate with card payment provider API (e.g., Stripe)
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Card payment initiated',
      data: {
        transactionId: Date.now().toString(),
        amount,
        status: 'pending',
        redirectUrl: 'https://example.com/payment/confirm'
      }
    });
  } catch (error) {
    console.error('Initialize card payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating card payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Card payment callback
 * @route POST /api/payments/card/callback
 */
exports.cardPaymentCallback = async (req, res) => {
  try {
    const { transactionId, status } = req.body;
    
    // In a real app, verify the callback with the card payment provider
    // and update the payment status accordingly
    
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Card payment callback processed'
    });
  } catch (error) {
    console.error('Card payment callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing card payment callback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get saved payment methods
 * @route GET /api/payments/methods
 */
exports.getSavedPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // In a real app, fetch saved payment methods from the database
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        methods: [
          {
            id: '1',
            type: 'card',
            brand: 'Visa',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2025,
            isDefault: true
          },
          {
            id: '2',
            type: 'mobile_money',
            provider: 'Orange Money',
            phoneNumber: '+2250123456789',
            isDefault: false
          }
        ]
      }
    });
  } catch (error) {
    console.error('Get saved payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching saved payment methods',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add payment method
 * @route POST /api/payments/methods
 */
exports.addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, cardToken, mobileMoneyProvider, phoneNumber } = req.body;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Payment method type is required'
      });
    }

    // In a real app, save the payment method to the database
    // For now, return a placeholder response
    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      data: {
        id: Date.now().toString(),
        type,
        isDefault: false,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding payment method',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete payment method
 * @route DELETE /api/payments/methods/:methodId
 */
exports.deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { methodId } = req.params;
    
    // In a real app, delete the payment method from the database
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment method',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
