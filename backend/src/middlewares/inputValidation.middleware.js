/**
 * Input Validation Middleware for Taxi-Express
 * Uses Joi to validate all user inputs
 */

const Joi = require('joi');

// Validation schemas for different endpoints
const schemas = {
  // Auth schemas
  register: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phoneNumber: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
    role: Joi.string().valid('client', 'driver').default('client'),
    preferredLanguage: Joi.string().valid('en', 'fr').default('fr')
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),
  
  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),
  
  resetPassword: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  }),
  
  verifyEmail: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().required()
  }),
  
  verifyPhone: Joi.object({
    phoneNumber: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
    code: Joi.string().required()
  }),
  
  // User schemas
  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    phoneNumber: Joi.string().pattern(/^\+?[0-9]{8,15}$/),
    preferredLanguage: Joi.string().valid('en', 'fr'),
    address: Joi.string().max(200),
    city: Joi.string().max(100),
    country: Joi.string().max(100)
  }),
  
  updateNotificationPreferences: Joi.object({
    email: Joi.boolean(),
    sms: Joi.boolean(),
    push: Joi.boolean(),
    promotions: Joi.boolean(),
    tripUpdates: Joi.boolean(),
    paymentUpdates: Joi.boolean()
  }),
  
  createTicket: Joi.object({
    subject: Joi.string().min(5).max(100).required(),
    message: Joi.string().min(10).max(1000).required(),
    category: Joi.string().valid('account', 'payment', 'trip', 'driver', 'other').required(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium')
  }),
  
  addTicketMessage: Joi.object({
    message: Joi.string().min(1).max(1000).required()
  }),
  
  addFavoriteLocation: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    address: Joi.string().min(1).max(200).required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    type: Joi.string().valid('home', 'work', 'other').default('other')
  }),
  
  // Driver schemas
  updateLocation: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    accuracy: Joi.number()
  }),
  
  updateAvailability: Joi.object({
    isAvailable: Joi.boolean().required()
  }),
  
  updateVerification: Joi.object({
    isVerified: Joi.boolean().required(),
    verificationNotes: Joi.string().max(500),
    rejectionReason: Joi.string().max(500).when('isVerified', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),
  
  updateVehicle: Joi.object({
    make: Joi.string().min(1).max(50).required(),
    model: Joi.string().min(1).max(50).required(),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1).required(),
    color: Joi.string().min(1).max(30).required(),
    licensePlate: Joi.string().min(1).max(20).required(),
    vehicleType: Joi.string().valid('standard', 'premium', 'suv', 'moto').required()
  }),
  
  // Trip schemas
  requestTrip: Joi.object({
    pickupLatitude: Joi.number().required(),
    pickupLongitude: Joi.number().required(),
    pickupAddress: Joi.string().min(1).max(200).required(),
    dropoffLatitude: Joi.number().required(),
    dropoffLongitude: Joi.number().required(),
    dropoffAddress: Joi.string().min(1).max(200).required(),
    estimatedDistance: Joi.number().min(0).required(),
    estimatedDuration: Joi.number().min(0).required(),
    vehicleType: Joi.string().valid('standard', 'premium', 'suv', 'moto').default('standard'),
    paymentMethod: Joi.string().valid('cash', 'wallet', 'card', 'mobile_money').default('cash'),
    promoCode: Joi.string().max(20),
    notes: Joi.string().max(500)
  }),
  
  completeTrip: Joi.object({
    finalDistance: Joi.number().min(0).required(),
    finalDuration: Joi.number().min(0).required()
  }),
  
  cancelTrip: Joi.object({
    reason: Joi.string().min(1).max(200).required()
  }),
  
  reportIncident: Joi.object({
    type: Joi.string().valid('accident', 'safety', 'lost_item', 'dispute', 'other').required(),
    description: Joi.string().min(10).max(1000).required(),
    severity: Joi.string().valid('low', 'medium', 'high').required()
  }),
  
  rateDriver: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().max(500)
  }),
  
  rateClient: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().max(500)
  }),
  
  extendTrip: Joi.object({
    newDropoffLatitude: Joi.number().required(),
    newDropoffLongitude: Joi.number().required(),
    newDropoffAddress: Joi.string().min(1).max(200).required(),
    additionalEstimatedDistance: Joi.number().min(0).required(),
    additionalEstimatedDuration: Joi.number().min(0).required()
  }),
  
  // Payment schemas
  processPayment: Joi.object({
    tripId: Joi.string().required(),
    amount: Joi.number().min(0).required(),
    paymentMethod: Joi.string().valid('cash', 'wallet', 'card', 'mobile_money').required(),
    currency: Joi.string().default('XOF')
  }),
  
  addWalletFunds: Joi.object({
    amount: Joi.number().min(100).required(),
    paymentMethod: Joi.string().valid('card', 'mobile_money').required(),
    currency: Joi.string().default('XOF')
  }),
  
  withdrawFunds: Joi.object({
    amount: Joi.number().min(100).required(),
    bankAccount: Joi.string().max(100),
    mobileMoneyNumber: Joi.string().pattern(/^\+?[0-9]{8,15}$/),
    withdrawalMethod: Joi.string().valid('bank', 'mobile_money').required()
  }),
  
  processWithdrawal: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    notes: Joi.string().max(500),
    rejectionReason: Joi.string().max(500).when('status', {
      is: 'rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),
  
  initializeMobileMoney: Joi.object({
    amount: Joi.number().min(100).required(),
    phoneNumber: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
    provider: Joi.string().valid('orange', 'mtn', 'moov').required(),
    currency: Joi.string().default('XOF')
  }),
  
  initializeCardPayment: Joi.object({
    amount: Joi.number().min(100).required(),
    currency: Joi.string().default('XOF'),
    cardToken: Joi.string(),
    saveCard: Joi.boolean().default(false)
  }),
  
  addPaymentMethod: Joi.object({
    type: Joi.string().valid('card', 'mobile_money').required(),
    cardNumber: Joi.string().pattern(/^[0-9]{16}$/).when('type', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    expiryMonth: Joi.string().pattern(/^[0-9]{2}$/).when('type', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    expiryYear: Joi.string().pattern(/^[0-9]{2}$/).when('type', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    cardholderName: Joi.string().when('type', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    mobileNumber: Joi.string().pattern(/^\+?[0-9]{8,15}$/).when('type', {
      is: 'mobile_money',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    provider: Joi.string().valid('orange', 'mtn', 'moov').when('type', {
      is: 'mobile_money',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),
  
  // Admin schemas
  updateUserStatus: Joi.object({
    isActive: Joi.boolean().required(),
    reason: Joi.string().max(500).when('isActive', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),
  
  updateDriverVerification: Joi.object({
    isVerified: Joi.boolean().required(),
    verificationNotes: Joi.string().max(500),
    rejectionReason: Joi.string().max(500).when('isVerified', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),
  
  reviewFraudLog: Joi.object({
    status: Joi.string().valid('confirmed', 'dismissed', 'pending').required(),
    actionTaken: Joi.string().max(500),
    notes: Joi.string().max(1000)
  }),
  
  updateSystemSettings: Joi.object({
    platformFee: Joi.number().min(0).max(100),
    baseFare: Joi.number().min(0),
    perKilometerRate: Joi.number().min(0),
    perMinuteRate: Joi.number().min(0),
    cancellationFee: Joi.number().min(0),
    maxDriverRadius: Joi.number().min(1),
    defaultLanguage: Joi.string().valid('en', 'fr'),
    supportEmail: Joi.string().email(),
    supportPhone: Joi.string().pattern(/^\+?[0-9]{8,15}$/)
  }),
  
  sendNotifications: Joi.object({
    userIds: Joi.array().items(Joi.string()).min(1),
    title: Joi.string().min(1).max(100).required(),
    message: Joi.string().min(1).max(1000).required(),
    type: Joi.string().valid('info', 'warning', 'alert').default('info'),
    channels: Joi.array().items(Joi.string().valid('app', 'sms', 'email')).min(1).required()
  }),
  
  // Fraud schemas
  blockUser: Joi.object({
    reason: Joi.string().min(1).max(500).required(),
    duration: Joi.number().min(1),
    permanent: Joi.boolean().default(false)
  }),
  
  unblockUser: Joi.object({
    notes: Joi.string().max(500)
  }),
  
  createFraudRule: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().min(1).max(500).required(),
    type: Joi.string().valid('location', 'payment', 'account', 'trip', 'other').required(),
    conditions: Joi.array().items(Joi.object()).min(1).required(),
    actions: Joi.array().items(Joi.object()).min(1).required(),
    riskScore: Joi.number().min(1).max(100).required(),
    isActive: Joi.boolean().default(true)
  }),
  
  updateFraudRule: Joi.object({
    name: Joi.string().min(1).max(100),
    description: Joi.string().min(1).max(500),
    conditions: Joi.array().items(Joi.object()),
    actions: Joi.array().items(Joi.object()),
    riskScore: Joi.number().min(1).max(100),
    isActive: Joi.boolean()
  }),
  
  manualFraudCheck: Joi.object({
    userId: Joi.string().required(),
    type: Joi.string().required(),
    data: Joi.object().required()
  }),
  
  // Matching schemas
  findDriver: Joi.object({
    tripId: Joi.string().required()
  }),
  
  updateMatchingParameters: Joi.object({
    distanceWeight: Joi.number().min(0).max(100),
    ratingWeight: Joi.number().min(0).max(100),
    acceptanceRateWeight: Joi.number().min(0).max(100),
    completionRateWeight: Joi.number().min(0).max(100),
    experienceWeight: Joi.number().min(0).max(100),
    languageMatchWeight: Joi.number().min(0).max(100),
    vehicleTypeWeight: Joi.number().min(0).max(100),
    previousTripsWeight: Joi.number().min(0).max(100)
  }),
  
  simulateMatching: Joi.object({
    pickupLatitude: Joi.number().required(),
    pickupLongitude: Joi.number().required(),
    dropoffLatitude: Joi.number().required(),
    dropoffLongitude: Joi.number().required(),
    clientId: Joi.string().required(),
    vehicleType: Joi.string().valid('standard', 'premium', 'suv', 'moto').default('standard')
  }),
  
  // Pricing schemas
  estimatePrice: Joi.object({
    pickupLatitude: Joi.number().required(),
    pickupLongitude: Joi.number().required(),
    dropoffLatitude: Joi.number().required(),
    dropoffLongitude: Joi.number().required(),
    estimatedDistance: Joi.number().min(0).required(),
    estimatedDuration: Joi.number().min(0).required(),
    vehicleType: Joi.string().valid('standard', 'premium', 'suv', 'moto').default('standard'),
    promoCode: Joi.string().max(20)
  }),
  
  validatePromoCode: Joi.object({
    promoCode: Joi.string().required(),
    amount: Joi.number().min(0).required()
  }),
  
  createPromotion: Joi.object({
    code: Joi.string().min(3).max(20).required(),
    description: Joi.string().min(1).max(200).required(),
    discountType: Joi.string().valid('percentage', 'fixed').required(),
    discountValue: Joi.number().min(0).required(),
    maxDiscount: Joi.number().min(0),
    minSubtotal: Joi.number().min(0),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    isActive: Joi.boolean().default(true),
    oneTimeUse: Joi.boolean().default(false),
    userType: Joi.string().valid('all', 'new', 'existing').default('all')
  }),
  
  updatePromotion: Joi.object({
    description: Joi.string().min(1).max(200),
    discountType: Joi.string().valid('percentage', 'fixed'),
    discountValue: Joi.number().min(0),
    maxDiscount: Joi.number().min(0),
    minSubtotal: Joi.number().min(0),
    startDate: Joi.date(),
    endDate: Joi.date(),
    isActive: Joi.boolean(),
    oneTimeUse: Joi.boolean(),
    userType: Joi.string().valid('all', 'new', 'existing')
  }),
  
  updatePricingRates: Joi.object({
    vehicleType: Joi.string().valid('standard', 'premium', 'suv', 'moto').required(),
    baseFare: Joi.number().min(0),
    perKilometer: Joi.number().min(0),
    perMinute: Joi.number().min(0),
    minimumFare: Joi.number().min(0),
    cancellationFee: Joi.number().min(0)
  }),
  
  calculateDriverEarnings: Joi.object({
    tripId: Joi.string().required()
  }),
  
  // SMS schemas
  sendSms: Joi.object({
    userId: Joi.string().required(),
    messageType: Joi.string().required(),
    messageData: Joi.object()
  }),
  
  sendBulkSms: Joi.object({
    userIds: Joi.array().items(Joi.string()).min(1).required(),
    messageType: Joi.string().required(),
    messageData: Joi.object()
  }),
  
  sendVerificationSms: Joi.object({
    phoneNumber: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required()
  }),
  
  sendPushNotification: Joi.object({
    userId: Joi.string().required(),
    title: Joi.string().min(1).max(100).required(),
    body: Joi.string().min(1).max(500).required(),
    data: Joi.object()
  }),
  
  sendBulkPushNotification: Joi.object({
    userIds: Joi.array().items(Joi.string()).min(1).required(),
    title: Joi.string().min(1).max(100).required(),
    body: Joi.string().min(1).max(500).required(),
    data: Joi.object()
  }),
  
  sendEmail: Joi.object({
    userId: Joi.string().required(),
    subject: Joi.string().min(1).max(100).required(),
    body: Joi.string().min(1).required(),
    template: Joi.string()
  }),
  
  sendBulkEmail: Joi.object({
    userIds: Joi.array().items(Joi.string()).min(1).required(),
    subject: Joi.string().min(1).max(100).required(),
    body: Joi.string().min(1).required(),
    template: Joi.string()
  }),
  
  updateNotificationTemplate: Joi.object({
    name: Joi.string().min(1).max(100),
    subject: Joi.string().min(1).max(100),
    content: Joi.string().min(1),
    variables: Joi.array().items(Joi.string()),
    language: Joi.string().valid('en', 'fr').required()
  }),
  
  testNotification: Joi.object({
    channel: Joi.string().valid('sms', 'email', 'push').required(),
    recipient: Joi.string().required(),
    template: Joi.string().required(),
    data: Joi.object()
  })
};

/**
 * Validate request input against schema
 * @param {string} schemaName - Name of the validation schema to use
 * @returns {Function} Express middleware function
 */
exports.validateInput = (schemaName) => {
  return (req, res, next) => {
    try {
      // Get schema
      const schema = schemas[schemaName];
      
      if (!schema) {
        console.error(`Validation schema not found: ${schemaName}`);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
      
      // Validate request body against schema
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        // Format validation errors
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
      }
      
      // Replace request body with validated value
      req.body = value;
      
      next();
    } catch (error) {
      console.error('Input validation error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Input validation error'
      });
    }
  };
};
