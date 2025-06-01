import React, { createContext, useState, useContext } from 'react';
import BookingService from '../services/booking.service';

// Créer le contexte
const BookingContext = createContext();

// Hook personnalisé pour utiliser le contexte de réservation
export const useBooking = () => {
  return useContext(BookingContext);
};

// Fournisseur du contexte de réservation
export const BookingProvider = ({ children }) => {
  const [currentBooking, setCurrentBooking] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Obtenir une estimation de prix
  const getEstimatedPrice = async (pickupLocation, dropoffLocation, vehicleType) => {
    setLoading(true);
    setError('');
    try {
      const response = await BookingService.getEstimatedPrice(
        pickupLocation,
        dropoffLocation,
        vehicleType
      );
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de l\'estimation du prix. Veuillez réessayer.'
      );
      setLoading(false);
      throw err;
    }
  };

  // Réserver un taxi
  const bookTaxi = async (bookingData) => {
    setLoading(true);
    setError('');
    try {
      const response = await BookingService.bookTaxi(bookingData);
      setCurrentBooking(response.data);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la réservation. Veuillez réessayer.'
      );
      setLoading(false);
      throw err;
    }
  };

  // Obtenir les détails d'une réservation
  const getBookingDetails = async (bookingId) => {
    setLoading(true);
    setError('');
    try {
      const response = await BookingService.getBookingDetails(bookingId);
      setCurrentBooking(response.data);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la récupération des détails de la réservation.'
      );
      setLoading(false);
      throw err;
    }
  };

  // Annuler une réservation
  const cancelBooking = async (bookingId, reason) => {
    setLoading(true);
    setError('');
    try {
      const response = await BookingService.cancelBooking(bookingId, reason);
      setCurrentBooking(null);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de l\'annulation de la réservation.'
      );
      setLoading(false);
      throw err;
    }
  };

  // Obtenir l'historique des réservations
  const getUserBookingHistory = async (page = 1, limit = 10) => {
    setLoading(true);
    setError('');
    try {
      const response = await BookingService.getUserBookingHistory(page, limit);
      setBookingHistory(response.data);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la récupération de l\'historique des réservations.'
      );
      setLoading(false);
      throw err;
    }
  };

  // Noter un trajet
  const rateTrip = async (tripId, rating, comment) => {
    setLoading(true);
    setError('');
    try {
      const response = await BookingService.rateTrip(tripId, rating, comment);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la notation du trajet.'
      );
      setLoading(false);
      throw err;
    }
  };

  // Valeur du contexte
  const value = {
    currentBooking,
    bookingHistory,
    loading,
    error,
    getEstimatedPrice,
    bookTaxi,
    getBookingDetails,
    cancelBooking,
    getUserBookingHistory,
    rateTrip,
    setError
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};

export default BookingContext;
