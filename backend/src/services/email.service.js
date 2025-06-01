/**
 * Email Service for Taxi-Express
 * Handles all email communications with users, drivers, and admins
 */

const nodemailer = require('nodemailer');

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password'
  }
});

// In development mode, use a test account if no credentials are provided
const setupDevTransport = async () => {
  if (process.env.NODE_ENV !== 'production' && 
      (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)) {
    try {
      // Create a test account if we're in development
      const testAccount = await nodemailer.createTestAccount();
      
      // Configure the transporter with ethereal credentials
      transporter.options = {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      };
      
      console.log('Using ethereal test account for email:', testAccount.user);
    } catch (error) {
      console.error('Failed to create test email account:', error);
    }
  }
};

// Call setup for development environment
if (process.env.NODE_ENV !== 'production') {
  setupDevTransport();
}

/**
 * Send a welcome email to a new user
 * @param {Object} user - User object with email and name
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendWelcomeEmail = async (user) => {
  try {
    const info = await transporter.sendMail({
      from: `"Taxi-Express" <${process.env.EMAIL_FROM || 'noreply@taxi-express.com'}>`,
      to: user.email,
      subject: 'Bienvenue sur Taxi-Express!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Bienvenue sur Taxi-Express, ${user.firstName || 'cher utilisateur'}!</h2>
          <p>Nous sommes ravis de vous compter parmi nos utilisateurs.</p>
          <p>Avec Taxi-Express, vous pouvez facilement réserver des courses, suivre vos chauffeurs en temps réel et voyager en toute sécurité.</p>
          <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
          <p>Cordialement,<br>L'équipe Taxi-Express</p>
        </div>
      `
    });
    
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

/**
 * Send a password reset email
 * @param {Object} user - User object with email
 * @param {String} resetToken - Password reset token
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://taxi-express.com'}/reset-password?token=${resetToken}`;
    
    const info = await transporter.sendMail({
      from: `"Taxi-Express" <${process.env.EMAIL_FROM || 'noreply@taxi-express.com'}>`,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Réinitialisation de votre mot de passe</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe:</p>
          <p><a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a></p>
          <p>Ce lien expirera dans 1 heure.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
          <p>Cordialement,<br>L'équipe Taxi-Express</p>
        </div>
      `
    });
    
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Send a trip receipt email
 * @param {Object} user - User object with email
 * @param {Object} trip - Trip details
 * @param {Object} payment - Payment details
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendTripReceiptEmail = async (user, trip, payment) => {
  try {
    const info = await transporter.sendMail({
      from: `"Taxi-Express" <${process.env.EMAIL_FROM || 'noreply@taxi-express.com'}>`,
      to: user.email,
      subject: `Reçu pour votre course #${trip.id.substring(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reçu de votre course Taxi-Express</h2>
          <p>Merci d'avoir voyagé avec nous!</p>
          
          <div style="border: 1px solid #ddd; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Détails de la course</h3>
            <p><strong>Date:</strong> ${new Date(trip.createdAt).toLocaleDateString()}</p>
            <p><strong>Heure:</strong> ${new Date(trip.createdAt).toLocaleTimeString()}</p>
            <p><strong>De:</strong> ${trip.originAddress}</p>
            <p><strong>À:</strong> ${trip.destinationAddress}</p>
            <p><strong>Distance:</strong> ${trip.distance} km</p>
            <p><strong>Durée:</strong> ${trip.duration} min</p>
          </div>
          
          <div style="border: 1px solid #ddd; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Paiement</h3>
            <p><strong>Montant:</strong> ${payment.amount} ${payment.currency}</p>
            <p><strong>Méthode:</strong> ${payment.paymentMethod}</p>
            <p><strong>Statut:</strong> ${payment.status}</p>
          </div>
          
          <p>Nous espérons vous revoir bientôt!</p>
          <p>Cordialement,<br>L'équipe Taxi-Express</p>
        </div>
      `
    });
    
    return info;
  } catch (error) {
    console.error('Error sending trip receipt email:', error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTripReceiptEmail
};
