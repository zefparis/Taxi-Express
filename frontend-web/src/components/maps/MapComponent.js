import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Form, Button, InputGroup, Alert, Spinner, Modal } from 'react-bootstrap';
import { GeoAlt, XCircle, Cursor, Search, Cash, ChatDots, TelephoneFill } from 'react-bootstrap-icons';
import { useAuth } from '../../contexts/AuthContext';
import MapService from '../../services/map.service';
import DriverService from '../../services/driver.service';
import PaymentService from '../../services/payment.service';
import ChatComponent from '../chat/ChatComponent';
import DriverCard from '../driver/DriverCard';
import DriverList from '../driver/DriverList';
import TripDetails from '../trip/TripDetails';
import TripSummary from '../trip/TripSummary';
import './MapComponent.css';

// Correction des icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

// Icônes personnalisées
const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097144.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1176/1176403.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const selectedDriverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097164.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38]
});

// Composant pour gérer les clics sur la carte
const MapClickHandler = ({ onMapClick }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    map.on('click', onMapClick);
    
    return () => {
      map.off('click', onMapClick);
    };
  }, [map, onMapClick]);
  
  return null;
};

// Composant pour gérer la position actuelle
const CurrentLocationHandler = ({ getCurrentLocation }) => {
  const map = useMap();
  
  const handleGetCurrentLocation = useCallback(async () => {
    try {
      const position = await MapService.getCurrentPosition();
      map.setView([position.lat, position.lng], 15);
      return position;
    } catch (err) {
      console.error('Erreur de géolocalisation:', err);
      throw err;
    }
  }, [map]);
  
  // Exposer la fonction au parent
  useEffect(() => {
    if (getCurrentLocation) {
      getCurrentLocation.current = handleGetCurrentLocation;
    }
  }, [getCurrentLocation, handleGetCurrentLocation]);
  
  return null;
};

const MapComponent = ({ 
  pickupLocation, 
  dropoffLocation, 
  onPickupChange, 
  onDropoffChange,
  className
}) => {
  const { currentUser } = useAuth();
  
  // États pour la carte et la recherche d'adresse
  const [error, setError] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  // États pour les chauffeurs
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isSearchingDrivers, setIsSearchingDrivers] = useState(false);
  const [searchRadius, setSearchRadius] = useState(2); // Rayon de recherche en km
  
  // États pour le chat
  const [showChat, setShowChat] = useState(false);
  
  // États pour la course
  const [tripDetails, setTripDetails] = useState(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [tripStatus, setTripStatus] = useState('idle'); // idle, searching, driver_selected, payment, completed
  const [paymentResult, setPaymentResult] = useState(null);
  const [showTripSummary, setShowTripSummary] = useState(false);
  
  // États pour les modales
  const [showDriverModal, setShowDriverModal] = useState(false);
  
  // Refs
  const mapRef = useRef(null);
  const getCurrentLocationRef = useRef(null);
  
  // Coordonnées par défaut (centre de Kinshasa, RDC)
  const defaultCenter = [-4.3217, 15.3125];
  
  // Fonction pour rechercher des adresses
  const searchAddresses = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const suggestions = await MapService.searchAddressSuggestions(query);
      setAddressSuggestions(suggestions);
    } catch (err) {
      console.error('Erreur lors de la recherche d\'adresses:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // Fonction pour obtenir la position actuelle
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setError(null);
    
    try {
      if (getCurrentLocationRef.current) {
        const position = await getCurrentLocationRef.current();
        
        // Mettre à jour les coordonnées
        if (onPickupChange) {
          onPickupChange(position);
        }
        
        // Obtenir l'adresse à partir des coordonnées
        try {
          const address = await MapService.reverseGeocode(position.lat, position.lng);
          setSearchQuery(address.displayName);
        } catch (geoErr) {
          console.error('Erreur lors du géocodage inverse:', geoErr);
        }
      }
    } catch (err) {
      setError(`Erreur de géolocalisation: ${err.message}`);
    } finally {
      setIsLocating(false);
    }
  };

  
  // Gérer les clics sur la carte
  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    
    // Si aucun point de départ n'est défini, définir le point de départ
    if (!pickupLocation) {
      if (onPickupChange) {
        onPickupChange({ lat, lng });
      }
    }
    // Si le point de départ est défini mais pas celui d'arrivée, définir le point d'arrivée
    else if (!dropoffLocation) {
      if (onDropoffChange) {
        onDropoffChange({ lat, lng });
      }
      // Calculer le prix estimé de la course
      if (pickupLocation) {
        const distance = MapService.calculateDistance(
          pickupLocation,
          { lat, lng }
        );
        const duration = Math.ceil(distance * 3); // Estimation: 3 minutes par km
        
        // Simuler le calcul du prix
        const price = {
          baseFare: 2000, // Francs congolais
          distanceCost: Math.round(distance * 500),
          timeCost: Math.round(duration * 100),
          total: Math.round(2000 + distance * 500 + duration * 100),
          currency: 'CDF',
          distance: distance.toFixed(1),
          duration
        };
        
        setTripPrice(price);
      }
    }
    // Si les deux points sont définis, réinitialiser
    else {
      if (onPickupChange) onPickupChange(null);
      if (onDropoffChange) onDropoffChange(null);
      setTripPrice(null);
      setNearbyDrivers([]);
      setSelectedDriver(null);
    }
  };
  
  // Gérer la sélection d'une suggestion d'adresse
  const handleSelectSuggestion = (suggestion) => {
    const { lat, lon } = suggestion;
    const latLng = { lat: parseFloat(lat), lng: parseFloat(lon) };
    
    // Ajouter un marqueur
    if (!pickupLocation) {
      // Mettre à jour les coordonnées de départ
      if (onPickupChange) {
        onPickupChange(latLng);
      }
    } else if (!dropoffLocation) {
      // Mettre à jour les coordonnées d'arrivée
      if (onDropoffChange) {
        onDropoffChange(latLng);
      }
    }
    
    // Mettre à jour le champ de recherche et effacer les suggestions
    setSearchQuery(suggestion.displayName);
    setAddressSuggestions([]);
  };
  
  // Gérer la recherche d'adresse
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Rechercher des adresses si la requête a au moins 3 caractères
    if (query.length >= 3) {
      searchAddresses(query);
    } else {
      setAddressSuggestions([]);
    }
  };
  
  // Estimer le temps de trajet
  const estimateTravelTime = () => {
    if (!pickupLocation || !dropoffLocation) return 0;
    
    // Calcul simple basé sur la distance (3 minutes par km)
    const distance = MapService.calculateDistance(pickupLocation, dropoffLocation);
    return Math.ceil(distance * 3);
  };
  
  // Rechercher des chauffeurs à proximité
  const searchNearbyDrivers = async () => {
    if (!pickupLocation) {
      setError('Veuillez définir un point de départ pour rechercher des chauffeurs.');
      return;
    }
    
    setIsSearchingDrivers(true);
    setError(null);
    setTripStatus('searching');
    
    try {
      // Appel au service de recherche de chauffeurs
      const drivers = await DriverService.getNearbyDrivers(pickupLocation, searchRadius);
      
      // Trier par distance
      setNearbyDrivers(drivers);
      
      // Si aucun chauffeur n'est disponible
      if (drivers.length === 0) {
        setError('Aucun chauffeur disponible dans votre zone. Essayez d\'élargir votre rayon de recherche.');
        setTripStatus('idle');
      }
    } catch (err) {
      console.error('Erreur lors de la recherche de chauffeurs:', err);
      setError('Échec de la recherche de chauffeurs. Veuillez réessayer.');
      setTripStatus('idle');
    } finally {
      setIsSearchingDrivers(false);
    }
  };
  
  // Sélectionner un chauffeur
  const handleSelectDriver = (driver) => {
    setSelectedDriver(driver);
    setShowDriverModal(false);
    setTripStatus('driver_selected');
    
    // Calculer les détails de la course
    if (pickupLocation && dropoffLocation) {
      const distance = parseFloat(driver.distance);
      const duration = parseInt(driver.estimatedArrival);
      
      // Calculer le prix de la course
      const tripPriceDetails = PaymentService.calculateTripPrice(distance, duration);
      
      setTripDetails({
        id: `trip-${Date.now()}`,
        pickup: {
          address: searchQuery || 'Point de départ',
          ...pickupLocation
        },
        dropoff: {
          address: dropoffLocation.address || 'Point d\'arrivée',
          ...dropoffLocation
        },
        distance,
        duration,
        ...tripPriceDetails,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // Afficher les détails de la course et le paiement
  const handleShowTripDetails = () => {
    setShowTripDetails(true);
    setTripStatus('payment');
  };
  
  // Gérer le paiement terminé
  const handlePaymentComplete = (result) => {
    setPaymentResult(result);
    setShowTripDetails(false);
    setShowTripSummary(true);
    setTripStatus('completed');
  };
  
  // Gérer l'annulation du paiement
  const handleCancelPayment = () => {
    setShowTripDetails(false);
    setTripStatus('driver_selected');
  };
  
  // Gérer la notation du chauffeur
  const handleRateDriver = (ratingData) => {
    console.log('Notation du chauffeur:', ratingData);
    // Ici, vous pourriez envoyer la notation au backend
  };
  
  // Fermer le résumé de la course
  const handleCloseTripSummary = () => {
    setShowTripSummary(false);
    resetTrip();
  };
  
  // Réinitialiser la course
  const resetTrip = () => {
    setSelectedDriver(null);
    setTripDetails(null);
    setPaymentResult(null);
    setTripStatus('idle');
    setNearbyDrivers([]);
    if (onPickupChange) onPickupChange(null);
    if (onDropoffChange) onDropoffChange(null);
    setSearchQuery('');
  };
  
  // Ouvrir le chat avec le chauffeur sélectionné
  const handleOpenChat = () => {
    setShowChat(true);
  };
  
  // Fermer le chat
  const handleCloseChat = () => {
    setShowChat(false);
  };
  
  // Ouvrir la liste des chauffeurs
  const handleOpenDriverList = () => {
    setShowDriverModal(true);
  };
  
  // Fermer la liste des chauffeurs
  const handleCloseDriverList = () => {
    setShowDriverModal(false);
  };

  useEffect(() => {
    // Si les deux points sont définis, calculer automatiquement la distance et le temps
    if (pickupLocation && dropoffLocation) {
      const distance = MapService.calculateDistance(pickupLocation, dropoffLocation);
      const duration = Math.ceil(distance * 3); // Estimation simple: 3 minutes par km
      
      // Préparation des détails de base de la course
      const baseTripDetails = {
        pickup: {
          address: searchQuery || 'Point de départ',
          ...pickupLocation
        },
        dropoff: {
          address: dropoffLocation.address || 'Point d\'arrivée',
          ...dropoffLocation
        },
        distance: distance.toFixed(1),
        duration
      };
      
      // Mise à jour des détails de la course
      setTripDetails(baseTripDetails);
    }
  }, [pickupLocation, dropoffLocation, searchQuery]);

  return (
    <div className={`map-component ${className || ''}`}>
      {/* Barre de recherche d'adresse */}
      <Form className="mb-3">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Rechercher une adresse..."
            value={searchQuery}
            onChange={handleSearchChange}
            disabled={isLocating || tripStatus !== 'idle'}
          />
          <Button
            variant="outline-secondary"
            onClick={() => handleGetCurrentLocation()}
            disabled={isLocating || tripStatus !== 'idle'}
          >
            {isLocating ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <GeoAlt />
            )}
          </Button>
          {tripStatus !== 'idle' && (
            <Button
              variant="outline-danger"
              onClick={resetTrip}
            >
              <XCircle />
            </Button>
          )}
        </InputGroup>
        
        {/* Suggestions d'adresses */}
        {isSearching && (
          <div className="mt-2 text-center">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Recherche en cours...</span>
          </div>
        )}
        
        {addressSuggestions.length > 0 && (
          <div className="address-suggestions mt-2">
            <div className="list-group">
              {addressSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="light"
                  className="list-group-item list-group-item-action text-start"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  {suggestion.displayName}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Messages d'erreur */}
        {error && (
          <Alert variant="danger" className="mt-2">
            {error}
          </Alert>
        )}
      </Form>
      
      {/* Carte */}
      <div className="mb-3" style={{ height: '400px', position: 'relative' }}>
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          whenCreated={mapInstance => {
            mapRef.current = mapInstance;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler onMapClick={handleMapClick} />
          <CurrentLocationHandler getCurrentLocation={getCurrentLocationRef} />
          
          {/* Marqueur du point de départ */}
          {pickupLocation && (
            <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
              <Popup>Point de départ</Popup>
            </Marker>
          )}
          
          {/* Marqueur du point d'arrivée */}
          {dropoffLocation && (
            <Marker position={[dropoffLocation.lat, dropoffLocation.lng]} icon={dropoffIcon}>
              <Popup>Point d'arrivée</Popup>
            </Marker>
          )}
          
          {/* Ligne entre les points */}
          {pickupLocation && dropoffLocation && (
            <Polyline
              positions={[
                [pickupLocation.lat, pickupLocation.lng],
                [dropoffLocation.lat, dropoffLocation.lng]
              ]}
              color="blue"
            />
          )}
          
          {/* Cercle de recherche */}
          {pickupLocation && tripStatus === 'searching' && (
            <Circle
              center={[pickupLocation.lat, pickupLocation.lng]}
              radius={searchRadius * 1000} // km en mètres
              pathOptions={{ color: 'rgba(0, 0, 255, 0.2)', fillColor: 'rgba(0, 0, 255, 0.1)' }}
            />
          )}
          
          {/* Marqueurs des chauffeurs */}
          {nearbyDrivers.map(driver => (
            <Marker
              key={driver.id}
              position={[driver.position.lat, driver.position.lng]}
              icon={selectedDriver && selectedDriver.id === driver.id ? selectedDriverIcon : driverIcon}
            >
              <Popup>
                <div>
                  <h6>{driver.name}</h6>
                  <p className="mb-1">
                    <strong>Véhicule:</strong> {driver.vehicle.model} ({driver.vehicle.color})
                  </p>
                  <p className="mb-1">
                    <strong>Plaque:</strong> {driver.vehicle.plate}
                  </p>
                  <p className="mb-1">
                    <strong>Évaluation:</strong> {driver.rating}/5.0
                  </p>
                  <p className="mb-1">
                    <strong>Distance:</strong> {driver.distance} km
                  </p>
                  <p className="mb-1">
                    <strong>Arrivée estimée:</strong> {driver.estimatedArrival} min
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-100"
                    onClick={() => handleSelectDriver(driver)}
                    disabled={selectedDriver && selectedDriver.id === driver.id}
                  >
                    {selectedDriver && selectedDriver.id === driver.id ? 'Sélectionné' : 'Sélectionner'}
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      
      {/* Détails du trajet */}
      {tripDetails && tripStatus === 'idle' && (
        <div className="mb-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Détails du trajet</h5>
              <p className="mb-1">
                <strong>Distance:</strong> {tripDetails.distance} km
              </p>
              <p className="mb-3">
                <strong>Durée estimée:</strong> {tripDetails.duration} min
              </p>
              <Button
                variant="primary"
                className="w-100"
                onClick={searchNearbyDrivers}
                disabled={isSearchingDrivers}
              >
                {isSearchingDrivers ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Recherche de chauffeurs...
                  </>
                ) : (
                  'Rechercher un chauffeur'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Liste des chauffeurs disponibles */}
      {nearbyDrivers.length > 0 && tripStatus === 'searching' && (
        <div className="mb-3">
          <DriverList
            drivers={nearbyDrivers}
            loading={isSearchingDrivers}
            error={error}
            onDriverSelect={handleSelectDriver}
            onDriverChat={handleOpenChat}
            onDriverCall={() => alert('Fonctionnalité d\'appel non implémentée')}
            selectedDriverId={selectedDriver?.id}
          />
        </div>
      )}
      
      {/* Chauffeur sélectionné */}
      {selectedDriver && tripStatus === 'driver_selected' && (
        <div className="mt-3">
          <DriverCard
            driver={selectedDriver}
            onChatClick={handleOpenChat}
            onCallClick={() => alert('Fonctionnalité d\'appel non implémentée')}
            onConfirmClick={handleShowTripDetails}
            isSelected={true}
          />
          
          <div className="d-grid gap-2 mt-3">
            <Button variant="primary" onClick={handleShowTripDetails}>
              <Cash className="me-2" />
              Procéder au paiement
            </Button>
            <Button variant="outline-secondary" onClick={resetTrip}>
              <XCircle className="me-2" />
              Annuler la course
            </Button>
          </div>
        </div>
      )}
      
      {/* Chat avec le chauffeur */}
      {showChat && selectedDriver && (
        <div className="chat-overlay">
          <ChatComponent 
            tripId={tripDetails?.id || `trip-${Date.now()}`} 
            driverId={selectedDriver.id} 
            userId={currentUser?.id || 'user-123'} 
            onClose={handleCloseChat} 
          />
        </div>
      )}
      
      {/* Instructions initiales */}
      {!pickupLocation && !dropoffLocation && tripStatus === 'idle' && (
        <div className="map-instructions mt-3 text-muted small">
          <p className="mb-1">
            <Cursor className="me-1" />
            Cliquez sur la carte pour définir le point de départ, puis cliquez à nouveau pour définir le point d'arrivée.
          </p>
          <p className="mb-0">
            <Search className="me-1" />
            Vous pouvez également rechercher une adresse dans la barre de recherche.
          </p>
        </div>
      )}
      
      {/* Modal pour les détails de paiement */}
      <Modal show={showTripDetails} onHide={handleCancelPayment} backdrop="static" size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Paiement de la course</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {tripDetails && selectedDriver && (
            <TripDetails
              trip={tripDetails}
              driver={selectedDriver}
              onPaymentComplete={handlePaymentComplete}
              onCancel={handleCancelPayment}
            />
          )}
        </Modal.Body>
      </Modal>
      
      {/* Modal pour le résumé de la course */}
      <Modal show={showTripSummary} onHide={handleCloseTripSummary} backdrop="static" size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Course terminée</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {tripDetails && selectedDriver && paymentResult && (
            <TripSummary
              trip={tripDetails}
              driver={selectedDriver}
              payment={paymentResult}
              onRateDriver={handleRateDriver}
              onClose={handleCloseTripSummary}
            />
          )}
        </Modal.Body>
      </Modal>
      
      {/* Modal pour la liste des chauffeurs */}
      <Modal show={showDriverModal} onHide={handleCloseDriverList} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Chauffeurs disponibles</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DriverList
            drivers={nearbyDrivers}
            loading={isSearchingDrivers}
            error={error}
            onDriverSelect={handleSelectDriver}
            onDriverChat={handleOpenChat}
            onDriverCall={() => alert('Fonctionnalité d\'appel non implémentée')}
            selectedDriverId={selectedDriver?.id}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MapComponent;
