import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import MapComponent from '../../components/maps/MapComponent';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../contexts/AuthContext';

const BookingPage = () => {
  const { isAuthenticated } = useAuth();
  const { getEstimatedPrice, bookTaxi, loading, error, setError } = useBooking();
  const navigate = useNavigate();
  
  const [bookingData, setBookingData] = useState({
    pickupLocation: '',
    dropoffLocation: '',
    pickupTime: '',
    vehicleType: 'standard',
    paymentMethod: 'cash',
    notes: ''
  });
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [step, setStep] = useState(1);
  
  // Coordonnées pour la carte
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  // État pour stocker les coordonnées de la carte
  
  useEffect(() => {
    // Rediriger vers la page de connexion si l'utilisateur n'est pas authentifié
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/book' } });
    }
    
    // Initialiser l'heure de prise en charge à l'heure actuelle + 30 minutes
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const formattedDateTime = now.toISOString().slice(0, 16);
    
    setBookingData(prev => ({
      ...prev,
      pickupTime: formattedDateTime
    }));
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookingData({
      ...bookingData,
      [name]: value
    });
    
    // Réinitialiser les estimations de prix si les emplacements changent
    if (name === 'pickupLocation' || name === 'dropoffLocation') {
      setEstimatedPrice(null);
    }
  };

  const handleEstimatePrice = async (e) => {
    e.preventDefault();
    setError('');
    
    // Vérifier que les deux emplacements sont renseignés
    if (!bookingData.pickupLocation || !bookingData.dropoffLocation) {
      return;
    }
    
    try {
      // Utiliser le contexte de réservation pour estimer le prix
      const response = await getEstimatedPrice(
        bookingData.pickupLocation,
        bookingData.dropoffLocation,
        bookingData.vehicleType
      );
      
      if (response && response.data) {
        setEstimatedPrice(response.data);
        setStep(2);
      }
    } catch (err) {
      console.error('Erreur lors de l\'estimation:', err);
    }
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Ajouter les coordonnées au bookingData
      const bookingDataWithCoords = {
        ...bookingData,
        pickupCoordinates: pickupCoords,
        dropoffCoordinates: dropoffCoords
      };
      
      const response = await bookTaxi(bookingDataWithCoords);
      
      if (response && response.data) {
        navigate('/history', { 
          state: { 
            bookingId: response.data.id,
            newBooking: true
          } 
        });
      }
    } catch (err) {
      console.error('Erreur lors de la réservation:', err);
    }
  };
  
  // Gestionnaires pour la carte
  const handlePickupLocationChange = (coords) => {
    setPickupCoords(coords);
    // Mettre à jour l'adresse dans le formulaire (simulation)
    setBookingData(prev => ({
      ...prev,
      pickupLocation: `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`
    }));
  };
  
  const handleDropoffLocationChange = (coords) => {
    setDropoffCoords(coords);
    // Mettre à jour l'adresse dans le formulaire (simulation)
    setBookingData(prev => ({
      ...prev,
      dropoffLocation: `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`
    }));
  };

  return (
    <Layout>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow">
              <div className="card-body p-4">
                <h2 className="text-center mb-4">Réserver un taxi</h2>
                
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                {step === 1 ? (
                  <form onSubmit={handleEstimatePrice}>
                    <div className="mb-4">
                      <h5 className="mb-3">Sélectionnez votre trajet</h5>
                      <MapComponent
                        pickupLocation={pickupCoords}
                        dropoffLocation={dropoffCoords}
                        onPickupChange={handlePickupLocationChange}
                        onDropoffChange={handleDropoffLocationChange}
                        className="mb-3"
                      />
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-md-6 mb-3 mb-md-0">
                        <label htmlFor="pickupLocation" className="form-label">
                          <i className="bi bi-geo-alt-fill text-success me-1"></i> Lieu de prise en charge
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="pickupLocation"
                          name="pickupLocation"
                          value={bookingData.pickupLocation}
                          onChange={handleChange}
                          placeholder="Ex: Aéroport Dakar"
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="dropoffLocation" className="form-label">
                          <i className="bi bi-geo-alt-fill text-danger me-1"></i> Destination
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="dropoffLocation"
                          name="dropoffLocation"
                          value={bookingData.dropoffLocation}
                          onChange={handleChange}
                          placeholder="Ex: Hôtel Radisson Blu"
                          required
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6 mb-3 mb-md-0">
                        <label htmlFor="pickupTime" className="form-label">
                          <i className="bi bi-clock me-1"></i> Date et heure de prise en charge
                        </label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          id="pickupTime"
                          name="pickupTime"
                          value={bookingData.pickupTime}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    
                      <div className="col-md-6">
                        <label htmlFor="vehicleType" className="form-label">
                          <i className="bi bi-car-front me-1"></i> Type de véhicule
                        </label>
                        <select
                          className="form-select"
                          id="vehicleType"
                          name="vehicleType"
                          value={bookingData.vehicleType}
                          onChange={handleChange}
                        >
                          <option value="standard">Standard (4 places)</option>
                          <option value="premium">Premium (4 places)</option>
                          <option value="van">Van (7 places)</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="vehicleType" className="form-label">
                        Type de véhicule
                      </label>
                      <select
                        className="form-select"
                        id="vehicleType"
                        name="vehicleType"
                        value={bookingData.vehicleType}
                        onChange={handleChange}
                      >
                        <option value="standard">Standard</option>
                        <option value="comfort">Confort</option>
                        <option value="premium">Premium</option>
                        <option value="van">Van (7 places)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 btn-lg"
                      disabled={loading || !bookingData.pickupLocation || !bookingData.dropoffLocation}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Estimation en cours...
                        </>
                      ) : 'Estimer le prix'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmitBooking}>
                    <div className="mb-4">
                      <div className="card bg-light">
                        <div className="card-body">
                          <h5 className="card-title">Détails de votre course</h5>
                          <p className="mb-1">
                            <strong>Départ:</strong> {bookingData.pickupLocation}
                          </p>
                          <p className="mb-1">
                            <strong>Destination:</strong> {bookingData.dropoffLocation}
                          </p>
                          <p className="mb-1">
                            <strong>Date et heure:</strong> {new Date(bookingData.pickupTime).toLocaleString()}
                          </p>
                          <p className="mb-1">
                            <strong>Type de véhicule:</strong> {bookingData.vehicleType.charAt(0).toUpperCase() + bookingData.vehicleType.slice(1)}
                          </p>
                          <p className="mb-0">
                            <strong>Prix estimé:</strong> {estimatedPrice ? `${estimatedPrice.amount} ${estimatedPrice.currency}` : 'Calcul en cours...'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="paymentMethod" className="form-label">
                        Méthode de paiement
                      </label>
                      <select
                        className="form-select"
                        id="paymentMethod"
                        name="paymentMethod"
                        value={bookingData.paymentMethod}
                        onChange={handleChange}
                      >
                        <option value="cash">Espèces</option>
                        <option value="card">Carte bancaire</option>
                        <option value="mobile_money">Mobile Money</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="notes" className="form-label">
                        Instructions spéciales (optionnel)
                      </label>
                      <textarea
                        className="form-control"
                        id="notes"
                        name="notes"
                        value={bookingData.notes}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Ex: Besoin d'aide avec les bagages, etc."
                      ></textarea>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-grow-1"
                        onClick={() => setStep(1)}
                      >
                        Retour
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary flex-grow-1"
                        disabled={loading}
                      >
                        {loading ? 'Réservation en cours...' : 'Confirmer la réservation'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BookingPage;
