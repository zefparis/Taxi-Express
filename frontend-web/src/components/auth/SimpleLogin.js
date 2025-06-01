import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SimpleLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation de base
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      setLoading(false);
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    // Simulation d'une connexion réussie (sans appel API)
    setTimeout(() => {
      // Créer un faux token JWT
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6ImZha2VAZXhhbXBsZS5jb20iLCJyb2xlIjoiY2xpZW50IiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      // Créer un faux utilisateur basé sur l'email fourni
      const fakeUser = {
        id: '1234567890',
        firstName: 'Utilisateur',
        lastName: 'Test',
        email: formData.email,
        phoneNumber: '+243123456789',
        role: 'client',
        isVerified: true
      };
      
      // Stocker le token et les informations utilisateur
      localStorage.setItem('token', fakeToken);
      localStorage.setItem('user', JSON.stringify(fakeUser));
      
      setSuccess(true);
      setLoading(false);
      
      // Rediriger vers la page d'accueil après 1.5 secondes
      setTimeout(() => {
        navigate('/');
      }, 1500);
    }, 1000);
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow">
          <div className="card-body p-4">
            <h2 className="text-center mb-4">Connexion</h2>
            
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            
            {success && (
              <div className="alert alert-success" role="alert">
                Connexion réussie ! Vous allez être redirigé vers la page d'accueil...
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="password" className="form-label">
                  Mot de passe
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="mb-3 text-end">
                <Link to="/forgot-password" className="text-decoration-none">
                  Mot de passe oublié ?
                </Link>
              </div>
              
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
              
              <div className="text-center mt-3">
                <span>Pas encore de compte ? </span>
                <Link to="/register" className="text-decoration-none">
                  S'inscrire
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLogin;
