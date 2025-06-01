/**
 * Payment Service for Taxi-Express
 * Handles payment processing, mobile money integration, and commission calculation
 */

const { Payment, User, Driver, Trip, Notification } = require('../models');
const { sendSMS } = require('./sms.service');
const { createAdminLog } = require('./admin.service');
const { checkFraudRisk } = require('./fraud.service');

// Platform commission rate (20%)
const PLATFORM_COMMISSION_RATE = 0.20;

/**
 * Process payment for a trip
 * @param {string} tripId - ID of the trip
 * @param {string} paymentMethod - Payment method (cash, wallet, mobile_money, card, paypal)
 * @param {string} transactionReference - External transaction reference (for mobile money, card, PayPal)
 * @param {Object} paymentDetails - Additional payment details
 * @returns {Promise<Object>} Payment object
 */
exports.processPayment = async (tripId, paymentMethod, transactionReference, paymentDetails = {}) => {
  try {
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
      throw new Error(`Trip not found: ${tripId}`);
    }

    // Check if trip is completed
    if (trip.status !== 'completed') {
      throw new Error('Payment can only be processed for completed trips');
    }

    // Check if payment already exists
    let payment = await Payment.findOne({
      where: { tripId }
    });

    if (!payment) {
      // Calculate platform fee (20% of final price)
      const platformFee = parseFloat(trip.finalPrice) * PLATFORM_COMMISSION_RATE;
      const driverAmount = parseFloat(trip.finalPrice) - platformFee;
      
      // Create new payment record
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
        paymentDetails: paymentDetails || {},
        paymentInitiatedAt: new Date()
      });
    } else if (payment.status === 'completed') {
      throw new Error('Payment has already been processed for this trip');
    } else {
      // Update existing payment record
      payment.paymentMethod = paymentMethod;
      payment.transactionReference = transactionReference;
      payment.paymentDetails = paymentDetails || {};
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
        
        // Notify driver
        await Notification.create({
          userId: trip.driver.userId,
          type: 'payment_received',
          title: 'Paiement en espèces',
          message: `Paiement en espèces de ${trip.finalPrice} CDF reçu pour la course #${trip.id}`,
          data: { tripId: trip.id, paymentId: payment.id },
          channel: 'app',
          priority: 'medium'
        });
        
        // Send SMS to driver
        await sendSMS(
          trip.driver.user.phoneNumber,
          `Paiement en espèces de ${trip.finalPrice} CDF reçu pour la course #${trip.id}. Votre part: ${payment.driverAmount} CDF.`,
          trip.driver.user.preferredLanguage || 'fr'
        );
        break;
        
      case 'wallet':
        // Process wallet payment
        await this.processWalletPayment(payment, trip);
        break;
        
      case 'mobile_money':
        // Process mobile money payment
        await this.processMobileMoneyPayment(payment, trip, paymentDetails);
        break;
        
      case 'card':
        // Process card payment
        await this.processCardPayment(payment, trip, paymentDetails);
        break;
        
      case 'paypal':
        // Process PayPal payment
        await this.processPayPalPayment(payment, trip, paymentDetails);
        break;
        
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    return payment;
  } catch (error) {
    console.error('Process payment error:', error);
    throw error;
  }
};

/**
 * Process wallet payment
 * @param {Object} payment - Payment object
 * @param {Object} trip - Trip object
 * @returns {Promise<Object>} Updated payment object
 */
exports.processWalletPayment = async (payment, trip) => {
  try {
    // Get client
    const client = await User.findByPk(trip.clientId);
    
    if (!client) {
      throw new Error(`Client not found: ${trip.clientId}`);
    }
    
    // Check wallet balance
    if (parseFloat(client.walletBalance) < parseFloat(trip.finalPrice)) {
      throw new Error('Insufficient wallet balance');
    }
    
    // Deduct from client wallet
    client.walletBalance = parseFloat(client.walletBalance) - parseFloat(trip.finalPrice);
    await client.save();
    
    // Add to driver wallet
    if (trip.driver && trip.driver.user) {
      const driver = trip.driver.user;
      driver.walletBalance = parseFloat(driver.walletBalance) + parseFloat(payment.driverAmount);
      await driver.save();
      
      // Notify driver
      await Notification.create({
        userId: driver.id,
        type: 'payment_received',
        title: 'Paiement par portefeuille',
        message: `${payment.driverAmount} CDF ajouté à votre portefeuille pour la course #${trip.id}`,
        data: { tripId: trip.id, paymentId: payment.id },
        channel: 'app',
        priority: 'medium'
      });
      
      // Send SMS to driver
      await sendSMS(
        driver.phoneNumber,
        `${payment.driverAmount} CDF ajouté à votre portefeuille pour la course #${trip.id}. Nouveau solde: ${driver.walletBalance} CDF.`,
        driver.preferredLanguage || 'fr'
      );
    }
    
    // Update payment status
    payment.status = 'completed';
    payment.paymentCompletedAt = new Date();
    await payment.save();
    
    // Notify client
    await Notification.create({
      userId: client.id,
      type: 'payment_completed',
      title: 'Paiement effectué',
      message: `${trip.finalPrice} CDF débité de votre portefeuille pour la course #${trip.id}`,
      data: { tripId: trip.id, paymentId: payment.id },
      channel: 'app',
      priority: 'medium'
    });
    
    // Send SMS to client
    await sendSMS(
      client.phoneNumber,
      `${trip.finalPrice} CDF débité de votre portefeuille pour la course #${trip.id}. Nouveau solde: ${client.walletBalance} CDF.`,
      client.preferredLanguage || 'fr'
    );
    
    return payment;
  } catch (error) {
    console.error('Process wallet payment error:', error);
    
    // Update payment status to failed
    payment.status = 'failed';
    payment.failureReason = error.message;
    await payment.save();
    
    throw error;
  }
};

/**
 * Process mobile money payment (UniPesa: Orange Money, Airtel Money, Africell Money)
 * @param {Object} payment - Payment object
 * @param {Object} trip - Trip object
 * @param {Object} paymentDetails - Mobile money payment details
 * @returns {Promise<Object>} Updated payment object
 */
exports.processMobileMoneyPayment = async (payment, trip, paymentDetails) => {
  try {
    const { provider, phoneNumber, reference } = paymentDetails;
    
    if (!provider || !phoneNumber) {
      throw new Error('Mobile money provider and phone number are required');
    }
    
    // In a real implementation, this would integrate with the mobile money API
    // For now, we'll simulate the payment process
    
    // Validate provider
    const validProviders = ['orange_money', 'airtel_money', 'africell_money', 'mpesa'];
    if (!validProviders.includes(provider)) {
      throw new Error(`Unsupported mobile money provider: ${provider}`);
    }
    
    // Update payment status to processing
    payment.status = 'processing';
    payment.paymentDetails = {
      ...payment.paymentDetails,
      provider,
      phoneNumber,
      reference,
      processingStarted: new Date()
    };
    await payment.save();
    
    // Get client
    const client = await User.findByPk(trip.clientId);
    
    // Send payment request SMS to client
    await sendSMS(
      phoneNumber,
      `Confirmez le paiement de ${trip.finalPrice} CDF pour Taxi-Express course #${trip.id}. Référence: ${reference || payment.id}`,
      client.preferredLanguage || 'fr'
    );
    
    // In a real implementation, we would wait for a callback from the mobile money provider
    // For now, we'll simulate a successful payment after a delay
    setTimeout(async () => {
      try {
        // Update payment status to completed
        payment.status = 'completed';
        payment.paymentCompletedAt = new Date();
        payment.paymentDetails = {
          ...payment.paymentDetails,
          transactionId: `MM-${Date.now()}`,
          providerReference: `${provider.toUpperCase()}-${Date.now()}`,
          processingCompleted: new Date()
        };
        await payment.save();
        
        // Add to driver wallet
        if (trip.driver && trip.driver.user) {
          const driver = trip.driver.user;
          driver.walletBalance = parseFloat(driver.walletBalance) + parseFloat(payment.driverAmount);
          await driver.save();
          
          // Notify driver
          await Notification.create({
            userId: driver.id,
            type: 'payment_received',
            title: 'Paiement mobile reçu',
            message: `${payment.driverAmount} CDF ajouté à votre portefeuille pour la course #${trip.id}`,
            data: { tripId: trip.id, paymentId: payment.id },
            channel: 'app',
            priority: 'medium'
          });
          
          // Send SMS to driver
          await sendSMS(
            driver.phoneNumber,
            `${payment.driverAmount} CDF ajouté à votre portefeuille pour la course #${trip.id}. Nouveau solde: ${driver.walletBalance} CDF.`,
            driver.preferredLanguage || 'fr'
          );
        }
        
        // Notify client
        await Notification.create({
          userId: client.id,
          type: 'payment_completed',
          title: 'Paiement mobile effectué',
          message: `${trip.finalPrice} CDF payé via ${provider.replace('_', ' ')} pour la course #${trip.id}`,
          data: { tripId: trip.id, paymentId: payment.id },
          channel: 'app',
          priority: 'medium'
        });
        
        // Send SMS to client
        await sendSMS(
          client.phoneNumber,
          `Paiement de ${trip.finalPrice} CDF via ${provider.replace('_', ' ')} confirmé pour la course #${trip.id}. Merci d'utiliser Taxi-Express!`,
          client.preferredLanguage || 'fr'
        );
      } catch (error) {
        console.error('Mobile money payment completion error:', error);
        
        // Update payment status to failed
        payment.status = 'failed';
        payment.failureReason = error.message;
        await payment.save();
      }
    }, 5000); // Simulate 5-second processing time
    
    return payment;
  } catch (error) {
    console.error('Process mobile money payment error:', error);
    
    // Update payment status to failed
    payment.status = 'failed';
    payment.failureReason = error.message;
    await payment.save();
    
    throw error;
  }
};

/**
 * Process card payment (Visa)
 * @param {Object} payment - Payment object
 * @param {Object} trip - Trip object
 * @param {Object} paymentDetails - Card payment details
 * @returns {Promise<Object>} Updated payment object
 */
exports.processCardPayment = async (payment, trip, paymentDetails) => {
  try {
    const { cardToken, last4, expiryMonth, expiryYear, cardholderName } = paymentDetails;
    
    if (!cardToken) {
      throw new Error('Card token is required');
    }
    
    // In a real implementation, this would integrate with a payment gateway
    // For now, we'll simulate the payment process
    
    // Update payment status to processing
    payment.status = 'processing';
    payment.paymentDetails = {
      ...payment.paymentDetails,
      last4: last4 || '****',
      expiryMonth,
      expiryYear,
      cardholderName,
      processingStarted: new Date()
    };
    await payment.save();
    
    // In a real implementation, we would process the payment with a payment gateway
    // For now, we'll simulate a successful payment after a delay
    setTimeout(async () => {
      try {
        // Update payment status to completed
        payment.status = 'completed';
        payment.paymentCompletedAt = new Date();
        payment.paymentDetails = {
          ...payment.paymentDetails,
          transactionId: `CARD-${Date.now()}`,
          authorizationCode: `AUTH-${Math.floor(Math.random() * 1000000)}`,
          processingCompleted: new Date()
        };
        await payment.save();
        
        // Get client
        const client = await User.findByPk(trip.clientId);
        
        // Add to driver wallet
        if (trip.driver && trip.driver.user) {
          const driver = trip.driver.user;
          driver.walletBalance = parseFloat(driver.walletBalance) + parseFloat(payment.driverAmount);
          await driver.save();
          
          // Notify driver
          await Notification.create({
            userId: driver.id,
            type: 'payment_received',
            title: 'Paiement par carte reçu',
            message: `${payment.driverAmount} CDF ajouté à votre portefeuille pour la course #${trip.id}`,
            data: { tripId: trip.id, paymentId: payment.id },
            channel: 'app',
            priority: 'medium'
          });
          
          // Send SMS to driver
          await sendSMS(
            driver.phoneNumber,
            `${payment.driverAmount} CDF ajouté à votre portefeuille pour la course #${trip.id}. Nouveau solde: ${driver.walletBalance} CDF.`,
            driver.preferredLanguage || 'fr'
          );
        }
        
        // Notify client
        await Notification.create({
          userId: client.id,
          type: 'payment_completed',
          title: 'Paiement par carte effectué',
          message: `${trip.finalPrice} CDF payé par carte pour la course #${trip.id}`,
          data: { tripId: trip.id, paymentId: payment.id },
          channel: 'app',
          priority: 'medium'
        });
        
        // Send SMS to client
        await sendSMS(
          client.phoneNumber,
          `Paiement de ${trip.finalPrice} CDF par carte confirmé pour la course #${trip.id}. Merci d'utiliser Taxi-Express!`,
          client.preferredLanguage || 'fr'
        );
      } catch (error) {
        console.error('Card payment completion error:', error);
        
        // Update payment status to failed
        payment.status = 'failed';
        payment.failureReason = error.message;
        await payment.save();
      }
    }, 3000); // Simulate 3-second processing time
    
    return payment;
  } catch (error) {
    console.error('Process card payment error:', error);
    
    // Update payment status to failed
    payment.status = 'failed';
    payment.failureReason = error.message;
    await payment.save();
    
    throw error;
  }
};

/**
 * Process PayPal payment
 * @param {Object} payment - Payment object
 * @param {Object} trip - Trip object
 * @param {Object} paymentDetails - PayPal payment details
 * @returns {Promise<Object>} Updated payment object
 */
exports.processPayPalPayment = async (payment, trip, paymentDetails) => {
  try {
    const { paypalToken, payerEmail } = paymentDetails;
    
    if (!paypalToken) {
      throw new Error('PayPal token is required');
    }
    
    // In a real implementation, this would integrate with PayPal API
    // For now, we'll simulate the payment process
    
    // Update payment status to processing
    payment.status = 'processing';
    payment.paymentDetails = {
      ...payment.paymentDetails,
      payerEmail,
      processingStarted: new Date()
    };
    await payment.save();
    
    // In a real implementation, we would process the payment with PayPal
    // For now, we'll simulate a successful payment after a delay
    setTimeout(async () => {
      try {
        // Update payment status to completed
        payment.status = 'completed';
        payment.paymentCompletedAt = new Date();
        payment.paymentDetails = {
          ...payment.paymentDetails,
          transactionId: `PP-${Date.now()}`,
          paypalTransactionId: `PAYPAL-${Math.floor(Math.random() * 1000000)}`,
          processingCompleted: new Date()
        };
        await payment.save();
        
        // Get client
        const client = await User.findByPk(trip.clientId);
        
        // Add to driver wallet
        if (trip.driver && trip.driver.user) {
          const driver = trip.driver.user;
          driver.walletBalance = parseFloat(driver.walletBalance) + parseFloat(payment.driverAmount);
          await driver.save();
          
          // Notify driver
          await Notification.create({
            userId: driver.id,
            type: 'payment_received',
            title: 'Paiement PayPal reçu',
            message: `${payment.driverAmount} CDF ajouté à votre portefeuille pour la course #${trip.id}`,
            data: { tripId: trip.id, paymentId: payment.id },
            channel: 'app',
            priority: 'medium'
          });
          
          // Send SMS to driver
          await sendSMS(
            driver.phoneNumber,
            `${payment.driverAmount} CDF ajouté à votre portefeuille pour la course #${trip.id}. Nouveau solde: ${driver.walletBalance} CDF.`,
            driver.preferredLanguage || 'fr'
          );
        }
        
        // Notify client
        await Notification.create({
          userId: client.id,
          type: 'payment_completed',
          title: 'Paiement PayPal effectué',
          message: `${trip.finalPrice} CDF payé via PayPal pour la course #${trip.id}`,
          data: { tripId: trip.id, paymentId: payment.id },
          channel: 'app',
          priority: 'medium'
        });
        
        // Send SMS to client
        await sendSMS(
          client.phoneNumber,
          `Paiement de ${trip.finalPrice} CDF via PayPal confirmé pour la course #${trip.id}. Merci d'utiliser Taxi-Express!`,
          client.preferredLanguage || 'fr'
        );
      } catch (error) {
        console.error('PayPal payment completion error:', error);
        
        // Update payment status to failed
        payment.status = 'failed';
        payment.failureReason = error.message;
        await payment.save();
      }
    }, 4000); // Simulate 4-second processing time
    
    return payment;
  } catch (error) {
    console.error('Process PayPal payment error:', error);
    
    // Update payment status to failed
    payment.status = 'failed';
    payment.failureReason = error.message;
    await payment.save();
    
    throw error;
  }
};

/**
 * Calculate driver payout amount
 * @param {number} tripAmount - Total trip amount
 * @returns {number} Driver payout amount after platform commission
 */
exports.calculateDriverPayout = (tripAmount) => {
  const platformFee = parseFloat(tripAmount) * PLATFORM_COMMISSION_RATE;
  return parseFloat(tripAmount) - platformFee;
};

/**
 * Get payment methods for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of payment methods
 */
exports.getUserPaymentMethods = async (userId) => {
  try {
    // In a real app, fetch saved payment methods from the database
    // For now, return a placeholder response
    return [
      {
        id: '1',
        type: 'mobile_money',
        provider: 'orange_money',
        phoneNumber: '+243123456789',
        isDefault: true
      },
      {
        id: '2',
        type: 'card',
        brand: 'Visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: false
      },
      {
        id: '3',
        type: 'paypal',
        email: 'user@example.com',
        isDefault: false
      }
    ];
  } catch (error) {
    console.error('Get user payment methods error:', error);
    throw error;
  }
};

/**
 * Withdraw funds from driver wallet to mobile money
 * @param {string} driverId - Driver ID
 * @param {number} amount - Amount to withdraw
 * @param {Object} withdrawalDetails - Withdrawal details
 * @returns {Promise<Object>} Withdrawal object
 */
exports.withdrawFundsToMobileMoney = async (driverId, amount, withdrawalDetails) => {
  try {
    const { provider, phoneNumber } = withdrawalDetails;
    
    if (!provider || !phoneNumber) {
      throw new Error('Mobile money provider and phone number are required');
    }
    
    // Get driver
    const driver = await Driver.findByPk(driverId, {
      include: [{ model: User, as: 'userAccount' }]
    });
    
    if (!driver) {
      throw new Error(`Driver not found: ${driverId}`);
    }
    
    // Check wallet balance
    if (parseFloat(driver.user.walletBalance) < parseFloat(amount)) {
      throw new Error('Insufficient wallet balance');
    }
    
    // Create withdrawal record
    const withdrawal = {
      id: Date.now().toString(),
      driverId,
      userId: driver.userId,
      amount,
      fee: 0, // No fee for withdrawals
      netAmount: amount,
      withdrawalMethod: 'mobile_money',
      status: 'processing',
      details: {
        provider,
        phoneNumber,
        initiatedAt: new Date()
      }
    };
    
    // Deduct from driver wallet
    driver.user.walletBalance = parseFloat(driver.user.walletBalance) - parseFloat(amount);
    await driver.user.save();
    
    // In a real implementation, this would integrate with the mobile money API
    // For now, we'll simulate the withdrawal process
    
    // Notify driver
    await Notification.create({
      userId: driver.userId,
      type: 'withdrawal_initiated',
      title: 'Retrait en cours',
      message: `Votre retrait de ${amount} CDF vers ${provider.replace('_', ' ')} est en cours de traitement`,
      data: { withdrawalId: withdrawal.id },
      channel: 'app',
      priority: 'medium'
    });
    
    // Send SMS to driver
    await sendSMS(
      driver.user.phoneNumber,
      `Votre retrait de ${amount} CDF vers ${provider.replace('_', ' ')} (${phoneNumber}) est en cours de traitement. Référence: ${withdrawal.id}`,
      driver.user.preferredLanguage || 'fr'
    );
    
    // In a real implementation, we would process the withdrawal with the mobile money provider
    // For now, we'll simulate a successful withdrawal after a delay
    setTimeout(async () => {
      try {
        // Update withdrawal status to completed
        withdrawal.status = 'completed';
        withdrawal.details.completedAt = new Date();
        withdrawal.details.transactionId = `${provider.toUpperCase()}-${Date.now()}`;
        
        // Notify driver
        await Notification.create({
          userId: driver.userId,
          type: 'withdrawal_completed',
          title: 'Retrait effectué',
          message: `Votre retrait de ${amount} CDF vers ${provider.replace('_', ' ')} a été effectué avec succès`,
          data: { withdrawalId: withdrawal.id },
          channel: 'app',
          priority: 'medium'
        });
        
        // Send SMS to driver
        await sendSMS(
          driver.user.phoneNumber,
          `Votre retrait de ${amount} CDF vers ${provider.replace('_', ' ')} (${phoneNumber}) a été effectué avec succès. Nouveau solde: ${driver.user.walletBalance} CDF.`,
          driver.user.preferredLanguage || 'fr'
        );
      } catch (error) {
        console.error('Withdrawal completion error:', error);
        
        // Refund driver wallet in case of error
        driver.user.walletBalance = parseFloat(driver.user.walletBalance) + parseFloat(amount);
        await driver.user.save();
        
        // Update withdrawal status to failed
        withdrawal.status = 'failed';
        withdrawal.details.failureReason = error.message;
        
        // Notify driver
        await Notification.create({
          userId: driver.userId,
          type: 'withdrawal_failed',
          title: 'Échec du retrait',
          message: `Votre retrait de ${amount} CDF vers ${provider.replace('_', ' ')} a échoué. Le montant a été remboursé dans votre portefeuille.`,
          data: { withdrawalId: withdrawal.id },
          channel: 'app',
          priority: 'high'
        });
        
        // Send SMS to driver
        await sendSMS(
          driver.user.phoneNumber,
          `Échec du retrait de ${amount} CDF vers ${provider.replace('_', ' ')}. Le montant a été remboursé dans votre portefeuille. Nouveau solde: ${driver.user.walletBalance} CDF.`,
          driver.user.preferredLanguage || 'fr'
        );
      }
    }, 10000); // Simulate 10-second processing time
    
    return withdrawal;
  } catch (error) {
    console.error('Withdraw funds to mobile money error:', error);
    throw error;
  }
};
