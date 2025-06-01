import api from './api';

/**
 * Service de gestion des conversations pour Taxi-Express RDC
 * Gère les messages entre chauffeurs et clients
 */
class ChatService {
  /**
   * Récupère les messages d'une conversation
   * @param {string} tripId - Identifiant de la course
   * @returns {Promise<Array>} - Liste des messages
   */
  async getMessages(tripId) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Récupération des messages pour la course', tripId);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuler des messages
      const messages = [];
      const numMessages = Math.floor(Math.random() * 5) + 2; // 2 à 6 messages
      
      // Générer des ID aléatoires pour le chauffeur et le client
      const driverId = `driver-${Math.floor(Math.random() * 100) + 1}`;
      const userId = `user-${Math.floor(Math.random() * 1000) + 1}`;
      
      // Messages prédéfinis pour la simulation
      const driverMessages = [
        "Bonjour, je suis votre chauffeur. Je serai à votre position dans environ 5 minutes.",
        "Je suis en route, j'arrive bientôt.",
        "Je suis à l'entrée, où exactement vous trouvez-vous ?",
        "Pas de problème, je vous attends.",
        "J'ai bien reçu votre message, merci."
      ];
      
      const userMessages = [
        "Bonjour, je vous attends à l'entrée principale.",
        "D'accord, merci pour l'information.",
        "Je suis à côté du magasin sur votre droite.",
        "Pouvez-vous m'appeler quand vous arrivez ?",
        "Je serai là dans 2 minutes."
      ];
      
      // Générer des messages alternés entre chauffeur et client
      let currentTime = Date.now() - (numMessages * 2 * 60000); // Commencer il y a quelques minutes
      
      for (let i = 0; i < numMessages; i++) {
        // Message du chauffeur
        messages.push({
          id: `msg-${i * 2 + 1}`,
          tripId,
          senderId: driverId,
          receiverId: userId,
          content: driverMessages[i % driverMessages.length],
          timestamp: new Date(currentTime).toISOString(),
          isRead: true
        });
        
        currentTime += 60000; // Ajouter 1 minute
        
        // Message du client
        messages.push({
          id: `msg-${i * 2 + 2}`,
          tripId,
          senderId: userId,
          receiverId: driverId,
          content: userMessages[i % userMessages.length],
          timestamp: new Date(currentTime).toISOString(),
          isRead: i < numMessages - 1 // Le dernier message n'est pas lu
        });
        
        currentTime += 60000; // Ajouter 1 minute
      }
      
      return {
        messages,
        participants: {
          driver: { id: driverId },
          user: { id: userId }
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      throw new Error('Échec de la récupération des messages. Veuillez réessayer.');
    }
  }
  
  /**
   * Envoie un nouveau message
   * @param {Object} messageData - Données du message
   * @param {string} messageData.tripId - Identifiant de la course
   * @param {string} messageData.senderId - Identifiant de l'expéditeur
   * @param {string} messageData.receiverId - Identifiant du destinataire
   * @param {string} messageData.content - Contenu du message
   * @returns {Promise<Object>} - Message créé
   */
  async sendMessage(messageData) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Envoi d\'un nouveau message', messageData);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simuler une réponse de l'API
      return {
        id: `msg-${Date.now()}`,
        ...messageData,
        timestamp: new Date().toISOString(),
        isRead: false
      };
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw new Error('Échec de l\'envoi du message. Veuillez réessayer.');
    }
  }
  
  /**
   * Marque un message comme lu
   * @param {string} messageId - Identifiant du message
   * @returns {Promise<Object>} - Confirmation de mise à jour
   */
  async markMessageAsRead(messageId) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Marquage du message comme lu', messageId);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simuler une réponse de l'API
      return {
        success: true,
        messageId,
        isRead: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors du marquage du message comme lu:', error);
      throw new Error('Échec du marquage du message comme lu. Veuillez réessayer.');
    }
  }
  
  /**
   * Récupère les conversations actives d'un utilisateur
   * @param {string} userId - Identifiant de l'utilisateur
   * @returns {Promise<Array>} - Liste des conversations
   */
  async getUserConversations(userId) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Récupération des conversations de l\'utilisateur', userId);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuler des conversations
      const conversations = [];
      const numConversations = Math.floor(Math.random() * 3) + 1; // 1 à 3 conversations
      
      for (let i = 0; i < numConversations; i++) {
        const driverId = `driver-${Math.floor(Math.random() * 100) + 1}`;
        const tripId = `trip-${Math.floor(Math.random() * 1000) + 1}`;
        const lastMessageTime = new Date(Date.now() - Math.random() * 86400000); // Dans les dernières 24h
        
        conversations.push({
          id: `conv-${i + 1}`,
          tripId,
          participants: {
            driver: { id: driverId, name: `Chauffeur ${driverId.split('-')[1]}` },
            user: { id: userId, name: 'Vous' }
          },
          lastMessage: {
            content: Math.random() > 0.5 
              ? "Je suis en route, j'arrive bientôt."
              : "D'accord, je vous attends.",
            senderId: Math.random() > 0.5 ? driverId : userId,
            timestamp: lastMessageTime.toISOString()
          },
          unreadCount: Math.floor(Math.random() * 3)
        });
      }
      
      // Trier par date du dernier message (plus récent en premier)
      return conversations.sort((a, b) => 
        new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      throw new Error('Échec de la récupération des conversations. Veuillez réessayer.');
    }
  }
  
  /**
   * Récupère les détails d'une conversation
   * @param {string} conversationId - Identifiant de la conversation
   * @returns {Promise<Object>} - Détails de la conversation
   */
  async getConversationDetails(conversationId) {
    try {
      // Simulation d'un appel API (à remplacer par un appel réel)
      console.log('Récupération des détails de la conversation', conversationId);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Générer des ID aléatoires pour le chauffeur et le client
      const driverId = `driver-${Math.floor(Math.random() * 100) + 1}`;
      const userId = `user-${Math.floor(Math.random() * 1000) + 1}`;
      const tripId = `trip-${Math.floor(Math.random() * 1000) + 1}`;
      
      // Simuler les détails d'une conversation
      return {
        id: conversationId,
        tripId,
        participants: {
          driver: { 
            id: driverId, 
            name: `Chauffeur ${driverId.split('-')[1]}`,
            phone: `+243 9${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
            rating: (3.5 + Math.random() * 1.5).toFixed(1)
          },
          user: { 
            id: userId, 
            name: 'Vous',
            phone: `+243 9${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`
          }
        },
        trip: {
          status: ['en_cours', 'terminé', 'annulé'][Math.floor(Math.random() * 3)],
          pickup: {
            address: 'Adresse de départ',
            lat: -4.3217 + (Math.random() - 0.5) * 0.1,
            lng: 15.3125 + (Math.random() - 0.5) * 0.1
          },
          dropoff: {
            address: 'Adresse d\'arrivée',
            lat: -4.3217 + (Math.random() - 0.5) * 0.1,
            lng: 15.3125 + (Math.random() - 0.5) * 0.1
          }
        },
        createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de la conversation:', error);
      throw new Error('Échec de la récupération des détails de la conversation. Veuillez réessayer.');
    }
  }
}

export default new ChatService();
