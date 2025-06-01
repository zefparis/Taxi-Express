/**
 * FraudLog Model for Taxi-Express
 * Tracks potential fraudulent activities in the system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');
const Trip = require('./trip.model');

const FraudLog = sequelize.define('FraudLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  tripId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Trips',
      key: 'id'
    }
  },
  fraudType: {
    type: DataTypes.ENUM(
      'suspicious_location', 
      'multiple_accounts', 
      'payment_fraud', 
      'excessive_cancellations',
      'route_manipulation', 
      'fake_gps', 
      'identity_theft', 
      'other'
    ),
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 100
    }
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  evidenceData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deviceInfo: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('detected', 'investigating', 'confirmed', 'dismissed'),
    defaultValue: 'detected'
  },
  actionTaken: {
    type: DataTypes.ENUM('none', 'warning', 'temporary_block', 'permanent_ban'),
    defaultValue: 'none'
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  detectedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

// Associations are defined in models/index.js

module.exports = FraudLog;
