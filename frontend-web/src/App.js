import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Pages
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BookingPage from './pages/booking/BookingPage';
import ProfilePage from './pages/profile/ProfilePage';
import RideHistoryPage from './pages/history/RideHistoryPage';
import SettingsPage from './pages/settings/SettingsPage';

// Context
import { useAuth } from './contexts/AuthContext';

// Protected route component
const ProtectedRoute = ({ children }) => {
  // Nous gardons useAuth() pour maintenir la structure mais sans déstructurer isAuthenticated
  // pour éviter l'erreur ESLint 'no-unused-vars'
  useAuth();
  
  // Commenté temporairement pour le développement
  // Décommentez cette section en production
  /*
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  */
  
  // Permet l'accès à toutes les pages sans authentification pendant le développement
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected routes */}
        <Route 
          path="/book" 
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <RideHistoryPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
