/**
 * Model Index for Taxi-Express
 * Centralizes all models and defines their relationships
 */

const User = require('./user.model');
const Driver = require('./driver.model');
const Trip = require('./trip.model');
const Payment = require('./payment.model');
const Notification = require('./notification.model');
const FraudLog = require('./fraudLog.model');
const AdminLog = require('./adminLog.model');

// Define relationships between models

// User and Driver relationship (one-to-one)
User.hasOne(Driver, { foreignKey: 'userId', as: 'driver' });
Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User and Trip relationships (one-to-many as client)
User.hasMany(Trip, { foreignKey: 'clientId', as: 'clientTrips' });
Trip.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

// Driver and Trip relationships (one-to-many)
Driver.hasMany(Trip, { foreignKey: 'driverId', as: 'driverTrips' });
Trip.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

// Trip and Payment relationships (one-to-many)
Trip.hasMany(Payment, { foreignKey: 'tripId', as: 'payments' });
Payment.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

// User and Payment relationships (one-to-many as client)
User.hasMany(Payment, { foreignKey: 'clientId', as: 'clientPayments' });
Payment.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

// User and Notification relationships (one-to-many)
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User and FraudLog relationships (one-to-many)
User.hasMany(FraudLog, { foreignKey: 'userId', as: 'fraudLogs' });
FraudLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Trip and FraudLog relationships (one-to-many)
Trip.hasMany(FraudLog, { foreignKey: 'tripId', as: 'fraudLogs' });
FraudLog.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

// User and AdminLog relationships (one-to-many)
User.hasMany(AdminLog, { foreignKey: 'adminId', as: 'adminLogs' });
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

module.exports = {
  User,
  Driver,
  Trip,
  Payment,
  Notification,
  FraudLog,
  AdminLog
};
