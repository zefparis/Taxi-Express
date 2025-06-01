/**
 * AdminLog Model for Taxi-Express
 * Tracks all administrative actions in the system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');

const AdminLog = sequelize.define('AdminLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.ENUM(
      'user_create', 
      'user_update', 
      'user_delete', 
      'user_block',
      'driver_verify', 
      'driver_reject', 
      'payment_refund', 
      'system_config',
      'trip_intervention',
      'fraud_review',
      'report_access',
      'login',
      'logout',
      'other'
    ),
    allowNull: false
  },
  targetType: {
    type: DataTypes.ENUM('user', 'driver', 'trip', 'payment', 'system', 'fraud', 'other'),
    allowNull: false
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  previousData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  newData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  performedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

// Associations
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

module.exports = AdminLog;
