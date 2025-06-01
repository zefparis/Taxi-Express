/**
 * Model Index for Taxi-Express
 * Centralizes all models and defines their relationships
 * 
 * IMPORTANT: Chaque association doit avoir un alias unique pour éviter l'erreur
 * "You have used the alias user in two separate associations. Aliased associations must have unique aliases."
 * 
 * Nous utilisons des alias explicites qui reflètent le rôle de chaque entité dans la relation:
 * - userAccount: Pour les relations où l'utilisateur est considéré comme un compte
 * - driverProfile: Pour les relations où le conducteur est considéré comme un profil
 * - tripClient: Pour les relations où l'utilisateur est le client d'un trajet
 * - tripDriver: Pour les relations où le conducteur est associé à un trajet
 * - paymentClient: Pour les relations où l'utilisateur est le client d'un paiement
 * - notificationRecipient: Pour les relations où l'utilisateur est le destinataire d'une notification
 * - fraudReportedUser: Pour les relations où l'utilisateur est associé à un rapport de fraude
 * - adminUser: Pour les relations où l'utilisateur est un administrateur
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
User.hasOne(Driver, { foreignKey: 'userId', as: 'driverProfile' });
Driver.belongsTo(User, { foreignKey: 'userId', as: 'userAccount' });

// User and Trip relationships (one-to-many as client)
User.hasMany(Trip, { foreignKey: 'clientId', as: 'clientTrips' });
Trip.belongsTo(User, { foreignKey: 'clientId', as: 'tripClient' });

// Driver and Trip relationships (one-to-many)
Driver.hasMany(Trip, { foreignKey: 'driverId', as: 'driverTrips' });
Trip.belongsTo(Driver, { foreignKey: 'driverId', as: 'tripDriver' });

// Trip and Payment relationships (one-to-many)
Trip.hasMany(Payment, { foreignKey: 'tripId', as: 'payments' });
Payment.belongsTo(Trip, { foreignKey: 'tripId', as: 'associatedTrip' });

// User and Payment relationships (one-to-many as client)
User.hasMany(Payment, { foreignKey: 'clientId', as: 'clientPayments' });
Payment.belongsTo(User, { foreignKey: 'clientId', as: 'paymentClient' });

// User and Notification relationships (one-to-many)
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'notificationRecipient' });

// User and FraudLog relationships (one-to-many)
User.hasMany(FraudLog, { foreignKey: 'userId', as: 'userFraudLogs' });
FraudLog.belongsTo(User, { foreignKey: 'userId', as: 'fraudReportedUser' });

// Trip and FraudLog relationships (one-to-many)
Trip.hasMany(FraudLog, { foreignKey: 'tripId', as: 'tripFraudLogs' });
FraudLog.belongsTo(Trip, { foreignKey: 'tripId', as: 'relatedTrip' });

// User and AdminLog relationships (one-to-many)
User.hasMany(AdminLog, { foreignKey: 'adminId', as: 'adminLogs' });
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'adminUser' });

module.exports = {
  User,
  Driver,
  Trip,
  Payment,
  Notification,
  FraudLog,
  AdminLog
};
