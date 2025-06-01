import React, { createContext, useState, useEffect, useContext } from 'react';
import AuthService from '../services/auth.service';

// Créer le contexte
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  return useContext(AuthContext);
};

// Fournisseur du contexte d'authentification
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté au chargement de l'application
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  // Fonction pour s'inscrire
  const register = async (userData) => {
    setError('');
    try {
      const response = await AuthService.register(userData);
      setCurrentUser(response.data.user);
      return response;
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de l\'inscription. Veuillez réessayer.'
      );
      throw err;
    }
  };

  // Fonction pour se connecter
  const login = async (email, password) => {
    setError('');
    try {
      const response = await AuthService.login(email, password);
      setCurrentUser(response.data.user);
      return response;
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur de connexion. Veuillez vérifier vos identifiants.'
      );
      throw err;
    }
  };

  // Fonction pour se déconnecter
  const logout = async () => {
    try {
      await AuthService.logout();
      setCurrentUser(null);
    } catch (err) {
      setError('Erreur lors de la déconnexion');
      console.error(err);
    }
  };

  // Vérifier si l'utilisateur est connecté
  const isAuthenticated = () => {
    return currentUser !== null && !AuthService.isTokenExpired();
  };

  // Valeur du contexte
  const value = {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
