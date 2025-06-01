/**
 * Trip Model for Taxi-Express
 * Represents a trip/ride in the system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');
const Driver = require('./driver.model');

const Trip = sequelize.define('Trip', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
    allowNull: true, // Can be null when trip is initially requested
    references: {
      model: 'Drivers',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('requested', 'assigned', 'active', 'completed', 'canceled', 'incident'),
    defaultValue: 'requested'
  },
  pickupLocation: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: false
  },
  pickupAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  destinationLocation: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: false
  },
  destinationAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  currentLocation: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: true
  },
  estimatedDistance: {
    type: DataTypes.FLOAT, // in kilometers
    allowNull: false
  },
  actualDistance: {
    type: DataTypes.FLOAT, // in kilometers
    allowNull: true
  },
  estimatedDuration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: false
  },
  actualDuration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: true
  },
  estimatedPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  finalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clientRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  driverRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  clientComment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  driverComment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  canceledBy: {
    type: DataTypes.ENUM('client', 'driver', 'system', 'admin'),
    allowNull: true
  },
  incidentDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  route: {
    type: DataTypes.GEOMETRY('LINESTRING'),
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'wallet', 'mobile_money', 'card'),
    defaultValue: 'cash'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  aiMatchScore: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  trafficConditions: {
    type: DataTypes.ENUM('light', 'moderate', 'heavy', 'severe'),
    allowNull: true
  }
}, {
  timestamps: true
});

// Associations are defined in models/index.js

module.exports = Trip;
