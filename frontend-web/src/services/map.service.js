/**
 * Service pour gérer les fonctionnalités liées aux cartes et à la géolocalisation
 */

// URL de base pour les requêtes d'API de géocodage (OpenStreetMap Nominatim)
const GEOCODING_API_URL = process.env.REACT_APP_NOMINATIM_URL || 'https://nominatim.openstreetmap.org';

// Note: Les coordonnées par défaut sont définies dans getCurrentPosition comme fallback

/**
 * Convertit une adresse en coordonnées géographiques (géocodage)
 * @param {string} address - L'adresse à géocoder
 * @returns {Promise<Object>} - Les coordonnées (lat, lng) et les détails de l'adresse
 */
const geocodeAddress = async (address) => {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: 1,
      addressdetails: 1
    });
    
    const response = await fetch(`${GEOCODING_API_URL}/search?${params}`, {
      headers: {
        'Accept-Language': 'fr',
        'User-Agent': 'Taxi-Express-App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur de géocodage: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      throw new Error('Aucun résultat trouvé pour cette adresse');
    }
    
    const result = data[0];
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      addressDetails: result.address
    };
  } catch (error) {
    console.error('Erreur lors du géocodage:', error);
    throw error;
  }
};

/**
 * Convertit des coordonnées en adresse (géocodage inverse)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} - Les détails de l'adresse
 */
const reverseGeocode = async (lat, lng) => {
  try {
    const params = new URLSearchParams({
      lat,
      lon: lng,
      format: 'json',
      addressdetails: 1
    });
    
    const response = await fetch(`${GEOCODING_API_URL}/reverse?${params}`, {
      headers: {
        'Accept-Language': 'fr',
        'User-Agent': 'Taxi-Express-App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur de géocodage inverse: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      displayName: data.display_name,
      addressDetails: data.address
    };
  } catch (error) {
    console.error('Erreur lors du géocodage inverse:', error);
    throw error;
  }
};

/**
 * Calcule la distance entre deux points en kilomètres (formule de Haversine)
 * @param {Object} point1 - Premier point {lat, lng}
 * @param {Object} point2 - Deuxième point {lat, lng}
 * @returns {number} - Distance en kilomètres
 */
const calculateDistance = (point1, point2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance en km
  
  return distance;
};

/**
 * Estime le temps de trajet entre deux points
 * @param {Object} point1 - Premier point {lat, lng}
 * @param {Object} point2 - Deuxième point {lat, lng}
 * @param {string} vehicleType - Type de véhicule (standard, premium, van)
 * @returns {number} - Temps estimé en minutes
 */
const estimateTravelTime = (point1, point2, vehicleType = 'standard') => {
  const distance = calculateDistance(point1, point2);
  
  // Vitesses moyennes en km/h selon le type de véhicule
  const averageSpeeds = {
    standard: 30, // Vitesse moyenne en ville
    premium: 35,  // Un peu plus rapide
    van: 25       // Plus lent
  };
  
  const speed = averageSpeeds[vehicleType] || averageSpeeds.standard;
  
  // Temps en heures = distance / vitesse
  const timeInHours = distance / speed;
  
  // Convertir en minutes et ajouter un temps fixe pour le démarrage
  const timeInMinutes = timeInHours * 60 + 5; // 5 minutes supplémentaires pour le démarrage
  
  return Math.round(timeInMinutes);
};

/**
 * Recherche des suggestions d'adresses à partir d'un texte partiel
 * @param {string} query - Texte de recherche
 * @param {string} country - Code du pays (par défaut 'sn' pour Sénégal)
 * @returns {Promise<Array>} - Liste des suggestions d'adresses
 */
const searchAddressSuggestions = async (query, country = 'sn') => {
  try {
    if (!query || query.length < 3) {
      return [];
    }
    
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: 5,
      addressdetails: 1,
      countrycodes: country
    });
    
    const response = await fetch(`${GEOCODING_API_URL}/search?${params}`, {
      headers: {
        'Accept-Language': 'fr',
        'User-Agent': 'Taxi-Express-App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur de recherche d'adresses: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.map(item => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      type: item.type,
      importance: item.importance
    }));
  } catch (error) {
    console.error('Erreur lors de la recherche d\'adresses:', error);
    return [];
  }
};

/**
 * Obtient la position actuelle de l'utilisateur
 * @returns {Promise<Object>} - Les coordonnées de l'utilisateur {lat, lng}
 */
const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n\'est pas prise en charge par votre navigateur'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        let errorMessage = 'Erreur inconnue lors de la géolocalisation';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'L\'utilisateur a refusé la demande de géolocalisation';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Les informations de localisation sont indisponibles';
            break;
          case error.TIMEOUT:
            errorMessage = 'La demande de géolocalisation a expiré';
            break;
          default:
            errorMessage = 'Erreur inconnue lors de la géolocalisation';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

// Exporter les fonctions du service
const MapService = {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  estimateTravelTime,
  searchAddressSuggestions,
  getCurrentPosition
};

export default MapService;
