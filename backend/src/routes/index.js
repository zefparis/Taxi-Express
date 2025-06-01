/**
 * Main Router for Taxi-Express API
 * Aggregates all route modules and exports them as a single router
 */

const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const driverRoutes = require('./driver.routes');
const tripRoutes = require('./trip.routes');
const paymentRoutes = require('./payment.routes');
const adminRoutes = require('./admin.routes');
const fraudRoutes = require('./fraud.routes');
const matchingRoutes = require('./matching.routes');
const pricingRoutes = require('./pricing.routes');
const smsRoutes = require('./sms.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/trips', tripRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/fraud', fraudRoutes);
router.use('/matching', matchingRoutes);
router.use('/pricing', pricingRoutes);
router.use('/sms', smsRoutes);

// API health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Taxi-Express API is running',
    version: process.env.API_VERSION || '1.0.0',
    timestamp: new Date()
  });
});

// API documentation redirect
router.get('/docs', (req, res) => {
  res.redirect('/api-docs');
});

module.exports = router;
