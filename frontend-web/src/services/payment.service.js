import api from './api';

/**
 * Service de gestion des paiements pour Taxi-Express RDC
 * Intègre UniPesa pour les paiements mobiles (Orange Money, Airtel Money, Africell Money)
 * ainsi que les paiements par carte Visa et PayPal
 */
class PaymentService {
  /**
   * Initialise un paiement via UniPesa (paiement mobile)
   * @param {Object} paymentData - Données du paiement
   * @param {number} paymentData.amount - Montant à payer
   * @param {string} paymentData.currency - Devise (CDF, USD)
   * @param {string} paymentData.phoneNumber - Numéro de téléphone du client
   * @param {string} paymentData.provider - Fournisseur de paiement mobile (orange, airtel, africell)
   * @param {string} paymentData.tripId - Identifiant de la course
   * @returns {Promise<Object>} - Résultat de l'initialisation du paiement
   */
  async initiateMobilePayment(paymentData) {
    try {
      // Simulation d'un appel API à UniPesa
      // À remplacer par un vrai appel API en production
      console.log('Initialisation du paiement mobile via UniPesa', paymentData);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simuler une réponse de l'API
      return {
        success: true,
        transactionId: 'UNIPESA-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: 'pending',
        message: `Un message a été envoyé au ${paymentData.phoneNumber}. Veuillez confirmer le paiement.`,
        providerName: this.getProviderName(paymentData.provider)
      };
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du paiement mobile:', error);
      throw new Error('Échec de l\'initialisation du paiement mobile. Veuillez réessayer.');
    }
  }
  
  /**
   * Initialise un paiement par carte bancaire
   * @param {Object} paymentData - Données du paiement
   * @param {number} paymentData.amount - Montant à payer
   * @param {string} paymentData.currency - Devise (CDF, USD)
   * @param {Object} paymentData.cardDetails - Détails de la carte
   * @param {string} paymentData.tripId - Identifiant de la course
   * @returns {Promise<Object>} - Résultat de l'initialisation du paiement
   */
  async initiateCardPayment(paymentData) {
    try {
      // Simulation d'un appel API pour le paiement par carte
      console.log('Initialisation du paiement par carte', paymentData);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simuler une réponse de l'API
      return {
        success: true,
        transactionId: 'CARD-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: 'completed',
        message: 'Paiement par carte traité avec succès.'
      };
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du paiement par carte:', error);
      throw new Error('Échec de l\'initialisation du paiement par carte. Veuillez réessayer.');
    }
  }
  
  /**
   * Initialise un paiement via PayPal
   * @param {Object} paymentData - Données du paiement
   * @param {number} paymentData.amount - Montant à payer
   * @param {string} paymentData.currency - Devise (USD)
   * @param {string} paymentData.tripId - Identifiant de la course
   * @returns {Promise<Object>} - URL de redirection PayPal et token
   */
  async initiatePayPalPayment(paymentData) {
    try {
      // Simulation d'un appel API pour le paiement PayPal
      console.log('Initialisation du paiement PayPal', paymentData);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuler une réponse de l'API avec URL de redirection
      return {
        success: true,
        redirectUrl: 'https://www.paypal.com/checkoutnow?token=SAMPLE_TOKEN',
        token: 'SAMPLE_TOKEN',
        message: 'Redirection vers PayPal pour finaliser le paiement.'
      };
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du paiement PayPal:', error);
      throw new Error('Échec de l\'initialisation du paiement PayPal. Veuillez réessayer.');
    }
  }
  
  /**
   * Vérifie le statut d'un paiement
   * @param {string} transactionId - Identifiant de la transaction
   * @returns {Promise<Object>} - Statut du paiement
   */
  async checkPaymentStatus(transactionId) {
    try {
      // Simulation d'un appel API pour vérifier le statut du paiement
      console.log('Vérification du statut du paiement', transactionId);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuler différents statuts possibles
      const statuses = ['pending', 'completed', 'failed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Pour la démo, si l'ID commence par UNIPESA, on simule un paiement mobile
      const isMobilePayment = transactionId.startsWith('UNIPESA');
      
      return {
        transactionId,
        status: randomStatus,
        timestamp: new Date().toISOString(),
        message: this.getStatusMessage(randomStatus),
        paymentMethod: isMobilePayment ? 'mobile' : 'card',
        // Simuler une commission de 20% pour le système
        commission: isMobilePayment ? '20%' : '20%'
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du statut du paiement:', error);
      throw new Error('Échec de la vérification du statut du paiement. Veuillez réessayer.');
    }
  }
  
  /**
   * Calcule le prix d'une course en fonction de la distance et du temps estimé
   * @param {Object} tripData - Données de la course
   * @param {number} tripData.distance - Distance en kilomètres
   * @param {number} tripData.duration - Durée estimée en minutes
   * @returns {Object} - Détails du prix calculé
   */
  calculateTripPrice(tripData) {
    // Tarifs pour la RDC (à ajuster selon les tarifs réels)
    const baseFare = 2000; // Francs congolais (CDF)
    const perKilometerRate = 500; // CDF par kilomètre
    const perMinuteRate = 100; // CDF par minute
    
    // Calcul du prix
    const distanceCost = tripData.distance * perKilometerRate;
    const timeCost = tripData.duration * perMinuteRate;
    const subtotal = baseFare + distanceCost + timeCost;
    
    // Arrondir au 100 CDF supérieur
    const roundedSubtotal = Math.ceil(subtotal / 100) * 100;
    
    // Calculer la commission de 20%
    const commission = roundedSubtotal * 0.2;
    const driverAmount = roundedSubtotal - commission;
    
    // Conversion approximative en USD (taux à ajuster selon le taux réel)
    const exchangeRate = 0.0005; // 1 CDF = 0.0005 USD (approximatif)
    const subtotalUSD = roundedSubtotal * exchangeRate;
    
    return {
      currency: 'CDF',
      baseFare,
      distanceCost,
      timeCost,
      subtotal: roundedSubtotal,
      commission,
      driverAmount,
      // Fournir aussi le montant en USD pour les paiements internationaux
      usdAmount: parseFloat(subtotalUSD.toFixed(2)),
      details: {
        distance: tripData.distance.toFixed(1) + ' km',
        duration: tripData.duration + ' min',
        baseFare: baseFare + ' CDF',
        perKm: perKilometerRate + ' CDF/km',
        perMin: perMinuteRate + ' CDF/min'
      }
    };
  }
  
  /**
   * Obtient le nom complet du fournisseur de paiement mobile
   * @param {string} providerCode - Code du fournisseur (orange, airtel, africell)
   * @returns {string} - Nom complet du fournisseur
   */
  getProviderName(providerCode) {
    const providers = {
      orange: 'Orange Money',
      airtel: 'Airtel Money',
      africell: 'Africell Money'
    };
    
    return providers[providerCode.toLowerCase()] || providerCode;
  }
  
  /**
   * Obtient un message descriptif pour un statut de paiement
   * @param {string} status - Statut du paiement
   * @returns {string} - Message descriptif
   */
  getStatusMessage(status) {
    const messages = {
      pending: 'Paiement en attente de confirmation.',
      completed: 'Paiement confirmé avec succès.',
      failed: 'Échec du paiement. Veuillez réessayer avec une autre méthode.'
    };
    
    return messages[status] || 'Statut de paiement inconnu.';
  }
}

export default new PaymentService();
