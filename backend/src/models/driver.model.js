/**
 * Driver Model for Taxi-Express
 * Extends User model with driver-specific information
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');

const Driver = sequelize.define('Driver', {
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
  vehicleType: {
    type: DataTypes.ENUM('car', 'motorcycle', 'taxi', 'minibus'),
    allowNull: false
  },
  vehicleMake: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehicleModel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehicleYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  licensePlate: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  licenseExpiry: {
    type: DataTypes.DATE,
    allowNull: false
  },
  insuranceNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  insuranceExpiry: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verificationStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  currentLocation: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: true
  },
  lastLocationUpdate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalTrips: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalEarnings: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  completionRate: {
    type: DataTypes.FLOAT,
    defaultValue: 100.0
  },
  acceptanceRate: {
    type: DataTypes.FLOAT,
    defaultValue: 100.0
  },
  driverLicenseImageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vehicleRegistrationImageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  insuranceImageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profileImageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

// Associations are defined in models/index.js

module.exports = Driver;
