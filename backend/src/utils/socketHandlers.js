/**
 * Socket.IO Handlers for Taxi-Express
 * Manages real-time communication between clients and drivers
 */

const { verifyToken } = require('./jwt');
const { Driver, User, Trip } = require('../models');
const { sendMessage } = require('../services/chat.service');

/**
 * Setup Socket.IO handlers
 * @param {Object} io - Socket.IO server instance
 */
const setupSocketHandlers = (io) => {
  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.user = decoded;
    next();
  });

  // Connection handler
  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.id}, role: ${socket.user.role}`);
    
    // Join user to a room based on their ID
    socket.join(`user_${socket.user.id}`);
    
    // Join role-based rooms
    if (socket.user.role === 'driver') {
      socket.join('drivers');
      
      // Get driver details
      const driver = await Driver.findOne({ 
        where: { userId: socket.user.id },
        attributes: ['id', 'isAvailable', 'currentLocation']
      });
      
      if (driver) {
        // Join driver-specific room
        socket.join(`driver_${driver.id}`);
        
        // Set driver as online
        if (driver.isAvailable) {
          io.emit('driver_available', {
            driverId: driver.id,
            userId: socket.user.id,
            location: driver.currentLocation
          });
        }
      }
    } else if (socket.user.role === 'client') {
      socket.join('clients');
      
      // Check for active trips
      const activeTrip = await Trip.findOne({
        where: {
          clientId: socket.user.id,
          status: ['requested', 'assigned', 'active']
        },
        attributes: ['id', 'status', 'driverId']
      });
      
      if (activeTrip) {
        // Join trip-specific room
        socket.join(`trip_${activeTrip.id}`);
      }
    }

    // Handle real-time location updates
    socket.on('location_update', async (data) => {
      try {
        const { latitude, longitude } = data;
        
        if (!latitude || !longitude) {
          socket.emit('error', { message: 'Latitude and longitude are required' });
          return;
        }
        
        if (socket.user.role === 'driver') {
          // Update driver location in database
          const driver = await Driver.findOne({ where: { userId: socket.user.id } });
          
          if (driver) {
            // Create a point geometry
            const point = { 
              type: 'Point', 
              coordinates: [parseFloat(longitude), parseFloat(latitude)] 
            };
            
            // Update driver location
            driver.currentLocation = point;
            driver.lastLocationUpdate = new Date();
            await driver.save();
            
            // Broadcast location to active trip client if any
            const activeTrip = await Trip.findOne({
              where: {
                driverId: driver.id,
                status: ['assigned', 'active']
              }
            });
            
            if (activeTrip) {
              io.to(`trip_${activeTrip.id}`).emit('driver_location', {
                tripId: activeTrip.id,
                driverId: driver.id,
                location: point,
                timestamp: new Date()
              });
            }
            
            // Broadcast to nearby clients searching for drivers
            io.to('clients').emit('nearby_driver_update', {
              driverId: driver.id,
              location: point,
              isAvailable: driver.isAvailable
            });
          }
        } else if (socket.user.role === 'client') {
          // For clients, just broadcast to their active trip
          const activeTrip = await Trip.findOne({
            where: {
              clientId: socket.user.id,
              status: ['assigned', 'active']
            }
          });
          
          if (activeTrip) {
            // Create a point geometry
            const point = { 
              type: 'Point', 
              coordinates: [parseFloat(longitude), parseFloat(latitude)] 
            };
            
            io.to(`trip_${activeTrip.id}`).emit('client_location', {
              tripId: activeTrip.id,
              clientId: socket.user.id,
              location: point,
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        console.error('Location update error:', error);
        socket.emit('error', { message: 'Error updating location' });
      }
    });

    // Handle chat messages
    socket.on('send_message', async (data) => {
      try {
        const { tripId, message, messageType = 'text' } = data;
        
        if (!tripId || !message) {
          socket.emit('error', { message: 'Trip ID and message are required' });
          return;
        }
        
        // Validate trip and user permission
        const trip = await Trip.findByPk(tripId);
        
        if (!trip) {
          socket.emit('error', { message: 'Trip not found' });
          return;
        }
        
        // Check if user is part of the trip
        const driver = await Driver.findOne({ where: { userId: socket.user.id } });
        const isClient = trip.clientId === socket.user.id;
        const isDriver = driver && trip.driverId === driver.id;
        
        if (!isClient && !isDriver) {
          socket.emit('error', { message: 'Not authorized to send messages for this trip' });
          return;
        }
        
        // Send message
        const messageObj = await sendMessage(tripId, socket.user.id, message, messageType);
        
        // Emit to trip room
        io.to(`trip_${tripId}`).emit('new_message', messageObj);
        
        // Emit to sender for confirmation
        socket.emit('message_sent', {
          success: true,
          messageId: messageObj.id
        });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', async (data) => {
      try {
        const { tripId, isTyping } = data;
        
        if (!tripId) {
          socket.emit('error', { message: 'Trip ID is required' });
          return;
        }
        
        // Validate trip and user permission
        const trip = await Trip.findByPk(tripId);
        
        if (!trip) {
          socket.emit('error', { message: 'Trip not found' });
          return;
        }
        
        // Check if user is part of the trip
        const driver = await Driver.findOne({ where: { userId: socket.user.id } });
        const isClient = trip.clientId === socket.user.id;
        const isDriver = driver && trip.driverId === driver.id;
        
        if (!isClient && !isDriver) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }
        
        // Emit typing indicator to trip room (excluding sender)
        socket.to(`trip_${tripId}`).emit('typing_indicator', {
          tripId,
          userId: socket.user.id,
          userType: isClient ? 'client' : 'driver',
          isTyping,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Typing indicator error:', error);
        socket.emit('error', { message: 'Error with typing indicator' });
      }
    });

    // Handle driver availability toggle
    socket.on('toggle_availability', async (data) => {
      try {
        const { isAvailable } = data;
        
        if (socket.user.role !== 'driver') {
          socket.emit('error', { message: 'Only drivers can update availability' });
          return;
        }
        
        // Update driver availability
        const driver = await Driver.findOne({ where: { userId: socket.user.id } });
        
        if (driver) {
          driver.isAvailable = isAvailable;
          await driver.save();
          
          // Broadcast availability update
          io.emit(isAvailable ? 'driver_available' : 'driver_unavailable', {
            driverId: driver.id,
            userId: socket.user.id,
            timestamp: new Date()
          });
          
          socket.emit('availability_updated', {
            success: true,
            isAvailable
          });
        } else {
          socket.emit('error', { message: 'Driver profile not found' });
        }
      } catch (error) {
        console.error('Toggle availability error:', error);
        socket.emit('error', { message: 'Error updating availability' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.id}`);
      
      // If driver, update availability status
      if (socket.user.role === 'driver') {
        try {
          const driver = await Driver.findOne({ where: { userId: socket.user.id } });
          
          if (driver) {
            // Set driver as offline
            io.emit('driver_unavailable', {
              driverId: driver.id,
              userId: socket.user.id,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('Disconnect handler error:', error);
        }
      }
    });
  });
};

module.exports = setupSocketHandlers;
