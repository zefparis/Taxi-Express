import api from './api';

const BookingService = {
  // Obtenir une estimation de prix
  getEstimatedPrice: async (pickupLocation, dropoffLocation, vehicleType) => {
    try {
      const response = await api.post('/pricing/estimate', {
        pickupLocation,
        dropoffLocation,
        vehicleType
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Réserver un taxi
  bookTaxi: async (bookingData) => {
    try {
      const response = await api.post('/trips/book', bookingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtenir les détails d'une réservation
  getBookingDetails: async (bookingId) => {
    try {
      const response = await api.get(`/trips/${bookingId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Annuler une réservation
  cancelBooking: async (bookingId, reason) => {
    try {
      const response = await api.post(`/trips/${bookingId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtenir l'historique des réservations de l'utilisateur
  getUserBookingHistory: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/user/trips?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Noter un trajet
  rateTrip: async (tripId, rating, comment) => {
    try {
      const response = await api.post(`/trips/${tripId}/rate`, {
        rating,
        comment
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Suivre la position du chauffeur en temps réel
  trackDriverLocation: async (tripId) => {
    try {
      const response = await api.get(`/trips/${tripId}/track`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default BookingService;
