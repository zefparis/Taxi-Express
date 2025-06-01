import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MapService from '../../services/map.service';

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
  // États
  const [error, setError] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  // Refs
  const mapRef = useRef(null);
  const getCurrentLocationRef = useRef(null);
  
  // Coordonnées par défaut (centre de Dakar, Sénégal)
  const defaultCenter = [14.7167, -17.4677];
  
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
    }
    // Si les deux points sont définis, réinitialiser
    else {
      if (onPickupChange) onPickupChange(null);
      if (onDropoffChange) onDropoffChange(null);
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
    if (!pickupLocation || !dropoffLocation) return null;
    
    return MapService.estimateTravelTime(pickupLocation, dropoffLocation);
  };
  
  return (
    <div className={`map-container ${className || ''}`}>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      <div className="mb-3">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher une adresse..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Rechercher une adresse"
          />
          <button 
            className="btn btn-outline-secondary" 
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <i className="bi bi-geo-alt"></i>
            )}
          </button>
        </div>
        
        {addressSuggestions.length > 0 && (
          <div className="address-suggestions mt-1 shadow-sm">
            <ul className="list-group">
              {addressSuggestions.map((suggestion, index) => (
                <li 
                  key={index} 
                  className="list-group-item list-group-item-action" 
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <small>{suggestion.displayName}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {isSearching && (
          <div className="text-center mt-1">
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <small className="ms-2">Recherche en cours...</small>
          </div>
        )}
      </div>
      
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        style={{ 
          height: '350px', 
          width: '100%', 
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pickupLocation && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]}>
            <Popup>Point de départ</Popup>
          </Marker>
        )}
        {dropoffLocation && (
          <Marker position={[dropoffLocation.lat, dropoffLocation.lng]}>
            <Popup>Point d'arrivée</Popup>
          </Marker>
        )}
        {pickupLocation && dropoffLocation && (
          <Polyline 
            positions={[
              [pickupLocation.lat, pickupLocation.lng],
              [dropoffLocation.lat, dropoffLocation.lng]
            ]}
            color="blue"
          />
        )}
        <MapClickHandler onMapClick={handleMapClick} />
        <CurrentLocationHandler getCurrentLocation={getCurrentLocationRef} />
      </MapContainer>
      
      {pickupLocation && dropoffLocation && (
        <div className="mt-2 p-2 bg-light rounded">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">
                <i className="bi bi-clock me-1"></i>
                Temps estimé: <strong>{estimateTravelTime()} min</strong>
              </small>
            </div>
            <div>
              <small className="text-muted">
                <i className="bi bi-rulers me-1"></i>
                Distance: <strong>
                  {MapService.calculateDistance(pickupLocation, dropoffLocation).toFixed(1)} km
                </strong>
              </small>
            </div>
          </div>
        </div>
      )}
      
      <div className="map-instructions mt-2 text-muted small">
        <p className="mb-1">
          <i className="bi bi-info-circle me-1"></i>
          Cliquez sur la carte pour définir le point de départ, puis cliquez à nouveau pour définir le point d'arrivée.
        </p>
        <p className="mb-0">
          <i className="bi bi-arrow-repeat me-1"></i>
          Pour réinitialiser, cliquez à nouveau après avoir défini les deux points.
        </p>
      </div>
    </div>
  );
};

export default MapComponent;
