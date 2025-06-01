/**
 * Authentication Controller for Taxi-Express
 * Handles user registration, login, and authentication
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Driver } = require('../models');
const { generateToken, verifyToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');
const { sendSMS } = require('../services/sms.service');
const { createAdminLog } = require('../services/admin.service');
const { validateRegistration, validateLogin } = require('../utils/validators');

/**
 * Register a new user (client or driver)
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    // Validate request body
    const { error } = validateRegistration(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }

    const { 
      firstName, lastName, email, phoneNumber, password, role,
      vehicleType, vehicleMake, vehicleModel, vehicleYear, licensePlate,
      licenseNumber, licenseExpiry, insuranceNumber, insuranceExpiry,
      preferredLanguage
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email },
          { phoneNumber }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or phone number already exists' 
      });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      role: role || 'client',
      preferredLanguage: preferredLanguage || 'fr',
      verificationToken,
      isVerified: false
    });

    // If registering as a driver, create driver profile
    if (role === 'driver') {
      if (!vehicleType || !vehicleMake || !vehicleModel || !vehicleYear || 
          !licensePlate || !licenseNumber || !licenseExpiry || 
          !insuranceNumber || !insuranceExpiry) {
        return res.status(400).json({
          success: false,
          message: 'Missing required driver information'
        });
      }

      await Driver.create({
        userId: user.id,
        vehicleType,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        licensePlate,
        licenseNumber,
        licenseExpiry,
        insuranceNumber,
        insuranceExpiry,
        isAvailable: false,
        isVerified: false,
        verificationStatus: 'pending'
      });
    }

    // Send verification email
    await sendVerificationEmail(user.email, user.verificationToken, preferredLanguage || 'fr');

    // Send welcome SMS
    await sendSMS(
      user.phoneNumber,
      `Bienvenue sur Taxi-Express! Vérifiez votre email pour activer votre compte.`,
      preferredLanguage || 'fr'
    );

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isVerified: user.isVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    // Validate request body
    const { error } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }

    const { email, phoneNumber, password } = req.body;

    // Find user by email or phone number
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email || '' },
          { phoneNumber: phoneNumber || '' }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // If user is admin, log the login
    if (user.role === 'admin') {
      await createAdminLog({
        adminId: user.id,
        action: 'login',
        targetType: 'user',
        targetId: user.id,
        details: 'Admin logged in',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Get driver information if user is a driver
    let driverInfo = null;
    if (user.role === 'driver') {
      driverInfo = await Driver.findOne({
        where: { userId: user.id },
        attributes: ['id', 'vehicleType', 'isAvailable', 'isVerified', 'verificationStatus']
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isVerified: user.isVerified,
          walletBalance: user.walletBalance,
          rating: user.rating,
          preferredLanguage: user.preferredLanguage,
          lastLogin: user.lastLogin
        },
        driver: driverInfo,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify user email
 * @route GET /api/auth/verify/:token
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with the verification token
    const user = await User.findOne({
      where: { verificationToken: token }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user verification status
    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      // Don't reveal that the user doesn't exist
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Update user with reset token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken, user.preferredLanguage);

    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    // Find user with the reset token
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update user password
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Send password changed notification
    await sendSMS(
      user.phoneNumber,
      `Votre mot de passe Taxi-Express a été changé. Si vous n'avez pas fait cette demande, contactez-nous immédiatement.`,
      user.preferredLanguage
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user with related data
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'verificationToken', 'resetPasswordToken', 'resetPasswordExpires'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get driver information if user is a driver
    let driverInfo = null;
    if (user.role === 'driver') {
      driverInfo = await Driver.findOne({
        where: { userId: user.id },
        attributes: [
          'id', 'vehicleType', 'vehicleMake', 'vehicleModel', 'vehicleYear',
          'licensePlate', 'isAvailable', 'isVerified', 'verificationStatus',
          'totalTrips', 'totalEarnings', 'completionRate', 'acceptanceRate'
        ]
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        driver: driverInfo
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout user (for admins)
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    // Only log admin logouts
    if (req.user.role === 'admin') {
      await createAdminLog({
        adminId: req.user.id,
        action: 'logout',
        targetType: 'user',
        targetId: req.user.id,
        details: 'Admin logged out',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh access token using refresh token
 * @route POST /api/auth/refresh
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret-key');
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new access token
    const newAccessToken = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        token: newAccessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify user phone number
 * @route POST /api/auth/verify-phone
 */
exports.verifyPhone = async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;

    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and verification code are required'
      });
    }

    // Find user with the phone number
    const user = await User.findOne({ where: { phoneNumber } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // In a real app, verify the code against what was sent
    // For now, we'll accept any 6-digit code for demonstration
    if (!/^\d{6}$/.test(verificationCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Update user's phone verification status
    user.isPhoneVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully'
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying phone number',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
