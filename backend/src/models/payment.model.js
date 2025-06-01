/**
 * Payment Model for Taxi-Express
 * Handles all payment transactions in the system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');
const Trip = require('./trip.model');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tripId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Trips',
      key: 'id'
    }
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Drivers',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  platformFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  driverAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'CDF' // Congolese Franc
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'wallet', 'mobile_money', 'card'),
    allowNull: false
  },
  mobileMoneyProvider: {
    type: DataTypes.ENUM('orange', 'airtel', 'africell', 'mpesa'),
    allowNull: true
  },
  mobileMoneyNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  externalReference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'),
    defaultValue: 'pending'
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refundedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  paymentInitiatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

// Associations
Payment.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
Payment.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

module.exports = Payment;
