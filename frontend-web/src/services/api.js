import axios from 'axios';

// Récupérer l'URL de base de l'API depuis les variables d'environnement
const API_URL = process.env.REACT_APP_API_URL || 'https://taxi-express.up.railway.app/api';

// Créer une instance axios avec l'URL de base de l'API
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Timeout de 10 secondes
});

// Intercepteur pour ajouter le token d'authentification aux requêtes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Gérer les erreurs 401 (non autorisé) - rediriger vers la page de connexion
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Fonction pour vérifier l'état de l'API
const checkApiStatus = async () => {
  try {
    const response = await api.get('/');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'état de l\'API:', error);
    throw error;
  }
};

// Exporter l'instance api et les fonctions utilitaires
export { checkApiStatus };
export default api;
