/**
 * Validators Utility for Taxi-Express
 * Contains validation functions for user input
 */

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} True if email is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (supports international formats)
 * @param {String} phone - Phone number to validate
 * @returns {Boolean} True if phone number is valid
 */
const isValidPhone = (phone) => {
  // Basic validation for phone numbers
  // Supports formats like: +243123456789, 00243123456789, 0123456789
  const phoneRegex = /^(\+|00)?[0-9]{1,4}[0-9]{6,14}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} Validation result with isValid flag and message
 */
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { 
      isValid: false, 
      message: 'Le mot de passe doit contenir au moins 8 caractères' 
    };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Le mot de passe doit contenir au moins une lettre majuscule' 
    };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Le mot de passe doit contenir au moins une lettre minuscule' 
    };
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Le mot de passe doit contenir au moins un chiffre' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validate Congolese license plate format
 * @param {String} licensePlate - License plate to validate
 * @returns {Boolean} True if license plate is valid
 */
const isValidLicensePlate = (licensePlate) => {
  // Format for DRC license plates: ABC 123D or 123 ABC D
  const licensePlateRegex = /^([A-Z]{3}\s\d{3}[A-Z])|(\d{3}\s[A-Z]{3}\s[A-Z])$/;
  return licensePlateRegex.test(licensePlate);
};

/**
 * Validate coordinates format (latitude, longitude)
 * @param {Number} lat - Latitude
 * @param {Number} lng - Longitude
 * @returns {Boolean} True if coordinates are valid
 */
const isValidCoordinates = (lat, lng) => {
  // Check if lat and lng are numbers
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  
  // Check if lat is between -90 and 90
  if (lat < -90 || lat > 90) {
    return false;
  }
  
  // Check if lng is between -180 and 180
  if (lng < -180 || lng > 180) {
    return false;
  }
  
  return true;
};

/**
 * Sanitize input string to prevent XSS attacks
 * @param {String} input - Input string to sanitize
 * @returns {String} Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Replace potentially dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate user registration data
 * @param {Object} data - Registration data
 * @returns {Object} Validation result with error property if invalid
 */
const validateRegistration = (data) => {
  const { firstName, lastName, email, phoneNumber, password, role } = data;
  
  // Check required fields
  if (!firstName || !lastName || !email || !phoneNumber || !password) {
    return {
      error: {
        details: [{ message: 'Tous les champs sont obligatoires' }]
      }
    };
  }
  
  // Validate email format
  if (!isValidEmail(email)) {
    return {
      error: {
        details: [{ message: 'Format d\'email invalide' }]
      }
    };
  }
  
  // Validate phone number
  if (!isValidPhone(phoneNumber)) {
    return {
      error: {
        details: [{ message: 'Format de numéro de téléphone invalide' }]
      }
    };
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return {
      error: {
        details: [{ message: passwordValidation.message }]
      }
    };
  }
  
  // Validate role if provided
  if (role && !['client', 'driver', 'admin'].includes(role)) {
    return {
      error: {
        details: [{ message: 'Rôle invalide' }]
      }
    };
  }
  
  return { error: null };
};

/**
 * Validate user login data
 * @param {Object} data - Login data
 * @returns {Object} Validation result with error property if invalid
 */
const validateLogin = (data) => {
  const { email, phoneNumber, password } = data;
  
  // Check if either email or phone is provided
  if (!email && !phoneNumber) {
    return {
      error: {
        details: [{ message: 'Email ou numéro de téléphone requis' }]
      }
    };
  }
  
  // Check password
  if (!password) {
    return {
      error: {
        details: [{ message: 'Mot de passe requis' }]
      }
    };
  }
  
  // Validate email format if provided
  if (email && !isValidEmail(email)) {
    return {
      error: {
        details: [{ message: 'Format d\'email invalide' }]
      }
    };
  }
  
  // Validate phone number if provided
  if (phoneNumber && !isValidPhone(phoneNumber)) {
    return {
      error: {
        details: [{ message: 'Format de numéro de téléphone invalide' }]
      }
    };
  }
  
  return { error: null };
};

module.exports = {
  isValidEmail,
  isValidPhone,
  validatePassword,
  isValidLicensePlate,
  isValidCoordinates,
  sanitizeInput,
  validateRegistration,
  validateLogin
};
