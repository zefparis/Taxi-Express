import api from './api';

const AuthService = {
  // Fonction pour s'inscrire (version simulée sans appel API)
  register: async (userData) => {
    return new Promise((resolve) => {
      // Simuler un délai réseau
      setTimeout(() => {
        // Créer un faux token JWT
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiY2xpZW50IiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        
        // Créer un faux utilisateur
        const fakeUser = {
          id: '1234567890',
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          role: userData.role || 'client',
          isVerified: false
        };
        
        // Stocker le token et les informations utilisateur
        localStorage.setItem('token', fakeToken);
        localStorage.setItem('user', JSON.stringify(fakeUser));
        
        // Retourner une réponse simulée
        resolve({
          success: true,
          message: 'Inscription réussie',
          data: {
            token: fakeToken,
            user: fakeUser
          }
        });
      }, 1000);
    });
  },

  // Fonction pour se connecter (version simulée sans appel API)
  login: async (email, password) => {
    return new Promise((resolve, reject) => {
      // Simuler un délai réseau
      setTimeout(() => {
        // Vérification basique des identifiants (pour démo uniquement)
        if (email && password.length >= 6) {
          // Créer un faux token JWT
          const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiY2xpZW50IiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
          
          // Créer un faux utilisateur basé sur l'email fourni
          const fakeUser = {
            id: '1234567890',
            firstName: 'Utilisateur',
            lastName: 'Test',
            email: email,
            phoneNumber: '+243123456789',
            role: 'client',
            isVerified: true
          };
          
          // Stocker le token et les informations utilisateur
          localStorage.setItem('token', fakeToken);
          localStorage.setItem('user', JSON.stringify(fakeUser));
          
          // Retourner une réponse simulée
          resolve({
            success: true,
            message: 'Connexion réussie',
            data: {
              token: fakeToken,
              user: fakeUser
            }
          });
        } else {
          // Simuler une erreur de connexion
          reject({
            response: {
              data: {
                success: false,
                message: 'Email ou mot de passe invalide'
              }
            }
          });
        }
      }, 1000);
    });
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
