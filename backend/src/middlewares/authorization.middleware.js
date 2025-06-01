/**
 * Authorization Middleware for Taxi-Express
 * Controls access based on user roles (admin, driver, client)
 */

/**
 * Authorize access based on user role
 * @param {string|Array<string>} roles - Required role(s) for access
 * @returns {Function} Express middleware function
 */
exports.authorize = (roles) => {
  // Convert single role to array
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    try {
      // Check if user exists (should be attached by auth middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user role
      const userRole = req.user.role;
      
      // Admin has access to everything
      if (userRole === 'admin') {
        return next();
      }
      
      // Check if user has required role
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource'
        });
      }
      
      // User has required role
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

/**
 * Check if user is the owner of a resource
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 * @returns {Function} Express middleware function
 */
exports.isResourceOwner = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // Check if user exists (should be attached by auth middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Get owner ID of the resource
      const ownerId = await getResourceOwnerId(req);
      
      // Check if user is the owner
      if (req.user.id !== ownerId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource'
        });
      }
      
      // User is the owner
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

/**
 * Check if user is a driver or client involved in a trip
 * @param {Function} getTripParticipantIds - Function to extract participant IDs from request
 * @returns {Function} Express middleware function
 */
exports.isTripParticipant = (getTripParticipantIds) => {
  return async (req, res, next) => {
    try {
      // Check if user exists (should be attached by auth middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin can access any trip
      if (req.user.role === 'admin') {
        return next();
      }

      // Get participant IDs of the trip
      const { clientId, driverId } = await getTripParticipantIds(req);
      
      // Check if user is a participant
      if (req.user.id !== clientId && req.user.id !== driverId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this trip'
        });
      }
      
      // User is a participant
      next();
    } catch (error) {
      console.error('Trip participant check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

/**
 * Check if user has permission for specific actions
 * @param {Function} checkPermission - Function to check if user has permission
 * @returns {Function} Express middleware function
 */
exports.hasPermission = (checkPermission) => {
  return async (req, res, next) => {
    try {
      // Check if user exists (should be attached by auth middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has permission
      const hasPermission = await checkPermission(req.user, req);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action'
        });
      }
      
      // User has permission
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};
