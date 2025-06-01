import api from './api';
import MapService from './map.service';

/**
 * Service de gestion des chauffeurs pour Taxi-Express RDC
 * Gère la géolocalisation, la disponibilité et les informations des chauffeurs
 */
class DriverService {
  /**
   * Récupère les chauffeurs disponibles à proximité d'une position
   * @param {Object} position - Position de référence (lat, lng)
   * @param {number} radius - Rayon de recherche en kilomètres
   * @returns {Promise<Array>} - Liste des chauffeurs disponibles
   */
  async getNearbyDrivers(position, radius = 5) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Recherche de chauffeurs à proximité', position, radius);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Générer des chauffeurs aléatoires autour de la position
      const drivers = [];
      const numDrivers = Math.floor(Math.random() * 5) + 2; // 2 à 6 chauffeurs
      
      for (let i = 0; i < numDrivers; i++) {
        // Générer une position aléatoire dans le rayon spécifié
        const angle = Math.random() * Math.PI * 2;
        const randomRadius = Math.random() * radius;
        const lat = position.lat + (randomRadius * Math.cos(angle) / 111);
        const lng = position.lng + (randomRadius * Math.sin(angle) / (111 * Math.cos(position.lat * Math.PI / 180)));
        
        drivers.push({
          id: `driver-${i + 1}`,
          name: `Chauffeur ${i + 1}`,
          position: { lat, lng },
          rating: (3.5 + Math.random() * 1.5).toFixed(1),
          vehicle: {
            model: ['Toyota Corolla', 'Honda Civic', 'Hyundai Elantra', 'Kia Rio', 'Suzuki Swift'][Math.floor(Math.random() * 5)],
            color: ['Blanc', 'Noir', 'Gris', 'Bleu', 'Rouge'][Math.floor(Math.random() * 5)],
            plate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 10000)}`
          },
          distance: MapService.calculateDistance(position, { lat, lng }).toFixed(1),
          estimatedArrival: Math.ceil(MapService.calculateDistance(position, { lat, lng }) * 3)
        });
      }
      
      // Trier par distance
      return drivers.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    } catch (error) {
      console.error('Erreur lors de la recherche de chauffeurs:', error);
      throw new Error('Échec de la recherche de chauffeurs. Veuillez réessayer.');
    }
  }
  
  /**
   * Récupère les détails d'un chauffeur
   * @param {string} driverId - Identifiant du chauffeur
   * @returns {Promise<Object>} - Détails du chauffeur
   */
  async getDriverDetails(driverId) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Récupération des détails du chauffeur', driverId);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuler les détails d'un chauffeur
      return {
        id: driverId,
        name: `Chauffeur ${driverId.split('-')[1]}`,
        phone: `+243 9${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
        email: `chauffeur${driverId.split('-')[1]}@taxiexpress.cd`,
        rating: (3.5 + Math.random() * 1.5).toFixed(1),
        totalRides: Math.floor(Math.random() * 500) + 50,
        joinDate: new Date(Date.now() - Math.random() * 31536000000).toISOString().split('T')[0], // Date aléatoire dans la dernière année
        vehicle: {
          model: ['Toyota Corolla', 'Honda Civic', 'Hyundai Elantra', 'Kia Rio', 'Suzuki Swift'][Math.floor(Math.random() * 5)],
          color: ['Blanc', 'Noir', 'Gris', 'Bleu', 'Rouge'][Math.floor(Math.random() * 5)],
          plate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 10000)}`,
          year: 2015 + Math.floor(Math.random() * 8)
        },
        isAvailable: Math.random() > 0.2, // 80% de chance d'être disponible
        currentLocation: {
          lat: -4.3217 + (Math.random() - 0.5) * 0.1,
          lng: 15.3125 + (Math.random() - 0.5) * 0.1
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du chauffeur:', error);
      throw new Error('Échec de la récupération des détails du chauffeur. Veuillez réessayer.');
    }
  }
  
  /**
   * Met à jour la position d'un chauffeur
   * @param {string} driverId - Identifiant du chauffeur
   * @param {Object} position - Nouvelle position (lat, lng)
   * @returns {Promise<Object>} - Confirmation de mise à jour
   */
  async updateDriverLocation(driverId, position) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Mise à jour de la position du chauffeur', driverId, position);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simuler une réponse de l'API
      return {
        success: true,
        driverId,
        position,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la position du chauffeur:', error);
      throw new Error('Échec de la mise à jour de la position. Veuillez réessayer.');
    }
  }
  
  /**
   * Met à jour la disponibilité d'un chauffeur
   * @param {string} driverId - Identifiant du chauffeur
   * @param {boolean} isAvailable - Disponibilité du chauffeur
   * @returns {Promise<Object>} - Confirmation de mise à jour
   */
  async updateDriverAvailability(driverId, isAvailable) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Mise à jour de la disponibilité du chauffeur', driverId, isAvailable);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simuler une réponse de l'API
      return {
        success: true,
        driverId,
        isAvailable,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la disponibilité du chauffeur:', error);
      throw new Error('Échec de la mise à jour de la disponibilité. Veuillez réessayer.');
    }
  }
  
  /**
   * Récupère l'historique des courses d'un chauffeur
   * @param {string} driverId - Identifiant du chauffeur
   * @param {Object} options - Options de pagination
   * @returns {Promise<Array>} - Liste des courses
   */
  async getDriverTrips(driverId, options = { page: 1, limit: 10 }) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Récupération des courses du chauffeur', driverId, options);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Générer des courses aléatoires
      const trips = [];
      const totalTrips = 20 + Math.floor(Math.random() * 30); // 20 à 50 courses
      
      for (let i = 0; i < Math.min(options.limit, totalTrips - (options.page - 1) * options.limit); i++) {
        const tripDate = new Date(Date.now() - Math.random() * 2592000000); // Dans les 30 derniers jours
        
        trips.push({
          id: `trip-${(options.page - 1) * options.limit + i + 1}`,
          driverId,
          userId: `user-${Math.floor(Math.random() * 1000) + 1}`,
          pickup: {
            address: 'Adresse de départ',
            lat: -4.3217 + (Math.random() - 0.5) * 0.1,
            lng: 15.3125 + (Math.random() - 0.5) * 0.1
          },
          dropoff: {
            address: 'Adresse d\'arrivée',
            lat: -4.3217 + (Math.random() - 0.5) * 0.1,
            lng: 15.3125 + (Math.random() - 0.5) * 0.1
          },
          distance: (1 + Math.random() * 10).toFixed(1),
          duration: Math.floor(5 + Math.random() * 30),
          fare: Math.floor(2000 + Math.random() * 15000),
          status: ['completed', 'completed', 'completed', 'cancelled'][Math.floor(Math.random() * 4)],
          paymentMethod: ['mobile', 'card', 'cash'][Math.floor(Math.random() * 3)],
          timestamp: tripDate.toISOString(),
          rating: Math.random() > 0.3 ? (3 + Math.random() * 2).toFixed(1) : null
        });
      }
      
      return {
        trips,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: totalTrips,
          pages: Math.ceil(totalTrips / options.limit)
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des courses du chauffeur:', error);
      throw new Error('Échec de la récupération des courses. Veuillez réessayer.');
    }
  }
  
  /**
   * Récupère les statistiques d'un chauffeur
   * @param {string} driverId - Identifiant du chauffeur
   * @returns {Promise<Object>} - Statistiques du chauffeur
   */
  async getDriverStats(driverId) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Récupération des statistiques du chauffeur', driverId);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuler des statistiques
      return {
        totalTrips: Math.floor(Math.random() * 500) + 50,
        totalDistance: Math.floor(Math.random() * 5000) + 500,
        totalEarnings: Math.floor(Math.random() * 1000000) + 100000,
        averageRating: (3.5 + Math.random() * 1.5).toFixed(1),
        completionRate: (80 + Math.random() * 20).toFixed(1) + '%',
        cancellationRate: (Math.random() * 10).toFixed(1) + '%',
        topAreas: [
          'Centre-ville',
          'Gombe',
          'Limete',
          'Ngaliema',
          'Kinshasa'
        ],
        monthlyStats: [
          { month: 'Jan', trips: Math.floor(Math.random() * 50) + 10, earnings: Math.floor(Math.random() * 100000) + 20000 },
          { month: 'Fév', trips: Math.floor(Math.random() * 50) + 10, earnings: Math.floor(Math.random() * 100000) + 20000 },
          { month: 'Mar', trips: Math.floor(Math.random() * 50) + 10, earnings: Math.floor(Math.random() * 100000) + 20000 },
          { month: 'Avr', trips: Math.floor(Math.random() * 50) + 10, earnings: Math.floor(Math.random() * 100000) + 20000 },
          { month: 'Mai', trips: Math.floor(Math.random() * 50) + 10, earnings: Math.floor(Math.random() * 100000) + 20000 },
          { month: 'Juin', trips: Math.floor(Math.random() * 50) + 10, earnings: Math.floor(Math.random() * 100000) + 20000 }
        ]
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques du chauffeur:', error);
      throw new Error('Échec de la récupération des statistiques. Veuillez réessayer.');
    }
  }
}

export default new DriverService();
