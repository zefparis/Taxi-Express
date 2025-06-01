import api from './api';

const AuthService = {
  // Fonction pour s'inscrire
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.success) {
        // Stocker le token et les informations utilisateur
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fonction pour se connecter
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        // Stocker le token et les informations utilisateur
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fonction pour se déconnecter
  logout: () => {
    // Supprimer le token et les informations utilisateur du localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Appeler l'API pour invalider le token côté serveur
    return api.post('/auth/logout').catch(() => {
      // Même si l'appel API échoue, on considère l'utilisateur déconnecté côté client
      console.log('Erreur lors de la déconnexion côté serveur');
    });
  },

  // Fonction pour récupérer l'utilisateur actuel
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // Fonction pour vérifier si l'utilisateur est connecté
  isLoggedIn: () => {
    return localStorage.getItem('token') !== null;
  },

  // Fonction pour vérifier si le token est expiré
  isTokenExpired: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return true;
    }

    try {
      // Décoder le token JWT (partie simple sans vérification de signature)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const { exp } = JSON.parse(jsonPayload);
      
      // Vérifier si le token est expiré
      return Date.now() >= exp * 1000;
    } catch (error) {
      return true;
    }
  },

  // Fonction pour rafraîchir le token
  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
      }
      return response.data;
    } catch (error) {
      // Si le rafraîchissement échoue, déconnecter l'utilisateur
      AuthService.logout();
      throw error;
    }
  },

  // Fonction pour demander la réinitialisation du mot de passe
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fonction pour réinitialiser le mot de passe
  resetPassword: async (token, password) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default AuthService;
